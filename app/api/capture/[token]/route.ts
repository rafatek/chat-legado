import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey || "")

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

// Flat object logic so deeply nested JSON (like from n8n) becomes one-level `key.subkey.name`
function flattenObject(ob: any, prefix = ''): Record<string, any> {
  const toReturn: Record<string, any> = {}
  
  if (!ob) return toReturn
  
  if (Array.isArray(ob)) {
    // Se o payload principal for um array e tiver só 1 item, a gente ignora o [0] pra ficar mais limpo
    if (prefix === '' && ob.length === 1) {
        const sub = flattenObject(ob[0], '')
        Object.assign(toReturn, sub)
    } else {
        for (let i = 0; i < ob.length; i++) {
            const sub = flattenObject(ob[i], `${prefix}[${i}].`)
            Object.assign(toReturn, sub)
        }
    }
  } else if (typeof ob === 'object' && ob !== null) {
      for (const i in ob) {
          if (!ob.hasOwnProperty(i)) continue
          
          if ((typeof ob[i]) === 'object' && ob[i] !== null) {
              const sub = flattenObject(ob[i], `${prefix}${i}.`)
              Object.assign(toReturn, sub)
          } else {
              toReturn[`${prefix}${i}`] = ob[i]
          }
      }
  } else {
      toReturn[prefix.slice(0, -1)] = ob
  }
  return toReturn
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    
    // 1. Fetch Webhook By Token
    const { data: webhook, error: hookError } = await supabaseAdmin
      .from('capture_webhooks')
      .select('*')
      .eq('token', token)
      .single()

    if (hookError || !webhook) {
      return NextResponse.json({ error: 'Webhook não encontrado ou inativo.' }, { status: 404, headers: corsHeaders })
    }

    let body
    try {
      body = await req.json()
    } catch (err: any) {
      return NextResponse.json({ error: 'Falha ao processar JSON (o payload pode estar mal formatado, faltando aspas ou chaves no final).', details: err.message }, { status: 400, headers: corsHeaders })
    }

    if (!body || Object.keys(body).length === 0) {
      return NextResponse.json({ error: 'O corpo da requisição (Body) está vazio.' }, { status: 400, headers: corsHeaders })
    }

    // A mágica: Transforma um JSON gigante de 5 níveis de profundidade em um objeto simples (Chave: Valor)
    const flatPayload = flattenObject(body)

    // 2. MODO TESTE
    if (webhook.is_testing) {
      await supabaseAdmin.from('capture_webhooks').update({ available_fields: flatPayload }).eq('id', webhook.id)
      return NextResponse.json({ success: true, mode: 'testing', captured_fields: Object.keys(flatPayload) }, { headers: corsHeaders })
    }

    // 3. MODO ATIVO
    if (!webhook.active) {
      return NextResponse.json({ error: 'Webhook inativo.' }, { status: 400, headers: corsHeaders })
    }

    // 4. Mapeamento de Payload
    const rawPhone = webhook.mapped_phone_key && flatPayload[webhook.mapped_phone_key] 
        ? String(flatPayload[webhook.mapped_phone_key]) : null
    const rawName = webhook.mapped_name_key && flatPayload[webhook.mapped_name_key]
        ? String(flatPayload[webhook.mapped_name_key]) : 'Lead Externo'

    if (!rawPhone) {
      return NextResponse.json({ error: 'Campo de telefone mapeado não encontrado no payload.' }, { status: 400, headers: corsHeaders })
    }

    // Formatar Telefone do Brasil (remover traços e remover o 55 da frente)
    let phone = rawPhone.replace(/\D/g, '')
    if (phone.startsWith('55') && phone.length >= 12) {
      phone = phone.slice(2)
    }

    // 5. Tratamento de LEAD (Buscar ou Criar sem duplicar)
    let { data: lead } = await supabaseAdmin
        .from('leads')
        .select('*')
        .eq('whatsapp', phone)
        .eq('user_id', webhook.user_id)
        .single()
        
    if (!lead) {
        // Encontrar a primeira coluna do Kanban para jogar esse lead novo
        const { data: firstColumn } = await supabaseAdmin
            .from('kanban_columns')
            .select('id')
            .eq('user_id', webhook.user_id)
            .order('position', { ascending: true })
            .limit(1)
            .single()

        const { data: newLead, error: leadError } = await supabaseAdmin.from('leads').insert({
            user_id: webhook.user_id,
            column_id: firstColumn?.id,
            full_name: rawName,
            whatsapp: phone,
            origin: 'Outros', // Usar hardcoded para nao quebrar a constraint leads_origin_check
            lead_pausado: true // Pausado por precaução para evitar IA de atropelar
        }).select().single()
        
        if (leadError) {
          return NextResponse.json({ error: 'Erro de Banco de Dados ao criar Lead', details: leadError.message }, { status: 500, headers: corsHeaders })
        }
        lead = newLead
    }

    // 6. Tratamento de CONVERSATION
    let { data: conversation } = await supabaseAdmin
        .from('conversations')
        .select('*')
        .eq('contact_phone', phone)
        .eq('user_id', webhook.user_id)
        .single()

    if (!conversation) {
        const { data: newConv, error: convError } = await supabaseAdmin.from('conversations').insert({
            user_id: webhook.user_id,
            lead_id: lead.id,
            contact_phone: phone,
            contact_name: rawName,
            last_message: '[Iniciado via Webhook]',
            last_message_at: new Date().toISOString()
        }).select().single()
        
        if (convError) {
          return NextResponse.json({ error: 'Erro de Banco de Dados ao criar Conversa', details: convError.message }, { status: 500, headers: corsHeaders })
        }
        conversation = newConv
    }

    // 7. Inject Variables na Mensagem Template
    let finalMessage = webhook.message_template || ''
    if (finalMessage) {
        for (const key of Object.keys(flatPayload)) {
            const val = flatPayload[key] !== null && flatPayload[key] !== undefined ? String(flatPayload[key]) : ''
            finalMessage = finalMessage.replace(new RegExp(`\\{\\{${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}\\}`, 'g'), val)
        }
    }

    if (!finalMessage.trim()) {
        return NextResponse.json({ success: true, note: 'Webhook received. No message to send.' }, { headers: corsHeaders })
    }

    // 8. Enviar mensagem na UazAPI / WhatsApp Connection
    const { data: connection } = await supabaseAdmin
        .from('whatsapp_connections')
        .select('instance_key, instance_name')
        .eq('user_id', webhook.user_id)
        .single()

    if (!connection || !connection.instance_key) {
        return NextResponse.json({ error: 'Nenhuma conexão do WhatsApp para este usuário.' }, { status: 400, headers: corsHeaders })
    }

    // Enviar API Request (Primeiro enviar, depois salvar no banco se der certo)
    const baseUrl = (process.env.NEXT_PUBLIC_UAZAPI_URL || '').replace(/\/$/, '')
    let sendSuccess = false
    let uazData = null

    try {
        const url = `${baseUrl}/message/sendText`
        const uazRes = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'token': connection.instance_key,
            },
            body: JSON.stringify({ number: phone, text: finalMessage }),
        })

        const responseText = await uazRes.text()
        if (uazRes.ok) {
            try { uazData = JSON.parse(responseText) } catch { uazData = {} }
            const isSuccessBase = uazData?.key || uazData?.message?.key || uazData?.status === 'SUCCESS' || uazData?.id
            if (isSuccessBase) {
                sendSuccess = true
            }
        }
    } catch (e) {
         console.error('Fetch UazAPI Error:', e);
    }

    // Finalizar: Salvar a mensagem no banco apenas se for enviada com sucesso
    if (sendSuccess) {
        await supabaseAdmin.from('messages').insert({
            conversation_id: conversation.id,
            user_id: webhook.user_id,
            lead_id: lead.id,
            content: finalMessage,
            from_me: true,
            status: 'sent',
            whatsapp_message_id: uazData?.key?.id || uazData?.message?.key?.id || uazData?.id || null
        })

        // Atualizar preview e count de acordo com o padrão do chat
        await supabaseAdmin.from('conversations').update({
            last_message: finalMessage,
            last_message_at: new Date().toISOString(),
            is_open: true
        }).eq('id', conversation.id)
    }

    return NextResponse.json({ success: true, sent: sendSuccess }, { headers: corsHeaders })

  } catch (error) {
    console.error("Capture API Error", error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: corsHeaders })
  }
}
