import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Helper para validar URLs contra SSRF (Server-Side Request Forgery)
function isSafeUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl)
    // Aceitar apenas HTTP/HTTPS
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false
    }

    const hostname = parsed.hostname.toLowerCase()

    // Sempre bloquear metadados de nuvem (AWS/GCP/Azure/DigitalOcean)
    const cloudMetadataHosts = [
      '169.254.169.254',
      'metadata.google.internal',
      'instance-data',
    ]

    if (cloudMetadataHosts.includes(hostname)) {
      return false
    }

    // Em ambiente de desenvolvimento local (npm run dev), permitir localhost/IPs de teste
    if (process.env.NODE_ENV === 'development') {
      return true
    }

    // Em produção: Bloquear localhost, loopbacks e redes locais
    const blockedHosts = ['localhost', '127.0.0.1', '::1', '0.0.0.0']
    if (blockedHosts.includes(hostname)) {
      return false
    }

    // Bloquear faixas de IP privadas (10.x.x.x, 192.168.x.x, 172.16-31.x.x, 127.x.x.x)
    if (
      /^10\./.test(hostname) ||
      /^192\.168\./.test(hostname) ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname) ||
      /^127\./.test(hostname)
    ) {
      return false
    }

    return true
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json()
    
    // O N8N deve enviar o payload completo da UazAPI
    const { BaseUrl, instanceName, token, message } = payload

    if (!BaseUrl || !message || !token) {
      return NextResponse.json({ error: 'Faltando BaseUrl, token ou message no payload.' }, { status: 400 })
    }

    // Validação Anti-SSRF da BaseUrl
    if (!isSafeUrl(BaseUrl)) {
      console.error('[process-media] Tentativa de SSRF bloqueada para BaseUrl:', BaseUrl)
      return NextResponse.json({ error: 'URL da UazAPI inválida ou não permitida.' }, { status: 400 })
    }

    console.log(`[process-media] Processando mídia recebida para a instância ${instanceName || 'N/A'}`)

    // 1. Pedir a URL de download para a UazAPI
    const downloadEndpoint = `${BaseUrl.replace(/\/$/, '')}/message/download`
    const uazRes = await fetch(downloadEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': token
      },
      body: JSON.stringify(message)
    })

    if (!uazRes.ok) {
      const errText = await uazRes.text()
      console.error('[process-media] Erro ao pedir URL de download para UazAPI:', errText)
      return NextResponse.json({ error: 'Erro ao conectar com UazAPI' }, { status: 502 })
    }

    const uazData = await uazRes.json()
    if (!uazData.fileURL) {
      console.error('[process-media] UazAPI não retornou a fileURL:', uazData)
      return NextResponse.json({ error: 'fileURL não encontrado na resposta da UazAPI' }, { status: 400 })
    }

    // Validação Anti-SSRF da fileURL
    if (!isSafeUrl(uazData.fileURL)) {
      console.error('[process-media] Tentativa de SSRF bloqueada para fileURL:', uazData.fileURL)
      return NextResponse.json({ error: 'fileURL insegura retornada pela UazAPI.' }, { status: 400 })
    }

    // 2. Fazer o download do arquivo binário da UazAPI
    console.log(`[process-media] Baixando arquivo da UazAPI: ${uazData.fileURL}`)
    const fileRes = await fetch(uazData.fileURL)
    if (!fileRes.ok) {
      return NextResponse.json({ error: 'Erro ao baixar o arquivo físico da UazAPI' }, { status: 502 })
    }

    const arrayBuffer = await fileRes.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Identificar a extensão do arquivo
    let extension = 'bin'
    const mimeType = message.content?.mimetype || message.mimetype || fileRes.headers.get('content-type')
    if (mimeType) {
      if (mimeType.includes('image/jpeg')) extension = 'jpeg'
      else if (mimeType.includes('image/png')) extension = 'png'
      else if (mimeType.includes('image/webp')) extension = 'webp'
      else if (mimeType.includes('video/mp4')) extension = 'mp4'
      else if (mimeType.includes('audio/ogg')) extension = 'ogg'
      else if (mimeType.includes('application/pdf')) extension = 'pdf'
    } else if (message.content?.fileName) {
      const parts = message.content.fileName.split('.')
      if (parts.length > 1) extension = parts.pop()
    }

    // 3. Fazer o upload para o Supabase
    // Vamos salvar em uma pasta com o telefone do remetente para organizar
    const senderPhone = (message.chatid || message.sender_pn || 'unknown').replace('@s.whatsapp.net', '')
    const fileName = `${senderPhone}/${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`

    console.log(`[process-media] Fazendo upload para o Supabase: ${fileName}`)
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('chat_media')
      .upload(fileName, buffer, {
        contentType: mimeType || 'application/octet-stream',
        upsert: false
      })

    if (uploadError) {
      console.error('[process-media] Erro no upload para Supabase:', uploadError)
      return NextResponse.json({ error: 'Erro ao fazer upload no Supabase' }, { status: 500 })
    }

    // 4. Retornar a URL pública final para o N8N
    const { data: { publicUrl } } = supabaseAdmin.storage.from('chat_media').getPublicUrl(fileName)
    console.log(`[process-media] Upload concluído! URL Pública gerada.`)

    return NextResponse.json({
      success: true,
      media_url: publicUrl,
      media_type: message.mediaType || 'document'
    })

  } catch (err: any) {
    console.error('[process-media] Erro fatal:', err)
    return NextResponse.json({ error: `Internal Server Error: ${err.message}` }, { status: 500 })
  }
}
