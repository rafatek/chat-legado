
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initializing Supabase Client with Service Role Key to bypass RLS for token lookup
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseServiceKey) {
  console.error("FATAL: SUPABASE_SERVICE_ROLE_KEY is missing. Webhooks require this key to bypass RLS.")
}

const supabase = createClient(supabaseUrl, supabaseServiceKey || "")

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  console.log("Webhook POST received")
  try {
    const { token } = await params
    console.log("Token received:", token)

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400, headers: corsHeaders })
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.warn("WARNING: Using ANON KEY for Webhook. This will likely fail RLS checks.")
    }

    const body = await req.json()
    console.log("Webhook Body:", JSON.stringify(body).slice(0, 300))

    // =============================================
    // CASE A: Incoming WhatsApp MESSAGE via UazAPI or n8n
    // Detect by presence of 'event', 'source', or message-like structure
    // =============================================
    const isIncomingMessage =
      body.event === 'messages.upsert' ||
      body.event === 'message' ||
      body.source === 'n8n' ||
      (body.data?.message && body.data?.key && !body.data?.key?.fromMe) ||
      (body.message && body.remoteJid) ||
      (body.phone && body.message)

    if (isIncomingMessage) {
      console.log("Detected: Incoming WhatsApp message (UazAPI/n8n)")
      await handleIncomingMessage(token, body)
      return NextResponse.json({ success: true, type: 'message' }, { headers: corsHeaders })
    }

    // =============================================
    // CASE B: Lead Extraction Webhook (original)
    // =============================================
    const leadsToInsert: any[] = []
    const items = Array.isArray(body) ? body : (body.items || [body])

    for (const item of items) {
      let normalizedLead: any = null

      if (item.nome_empresa || item.address || item.category) {
        normalizedLead = {
          full_name: item.nome_empresa || "Sem nome",
          whatsapp: item.telefone || item.phone || null,
          company_name: item.nome_empresa || null,
          origin: "Google Maps"
        }
      } else if (item.razao_social || item.cnpj) {
        normalizedLead = {
          full_name: item.razao_social || item.nome_fantasia || "Sem Razão Social",
          whatsapp: item.telefone || item.celular || null,
          company_name: item.nome_fantasia || item.razao_social || null,
          origin: "Extração CNPJ"
        }
      } else if (item.username || item.full_name || item.biography) {
        normalizedLead = {
          full_name: item.full_name || item.username || "Sem nome",
          whatsapp: item.phone || item.contato || item.whatsapp || null,
          company_name: item.category_name || item.biography || null,
          origin: "Instagram"
        }
      } else {
        normalizedLead = {
          full_name: item.name || item.nome || "Lead Desconhecido",
          whatsapp: item.phone || item.telefone || item.whatsapp || null,
          company_name: item.company || item.empresa || null,
          origin: "Outros"
        }
      }

      if (normalizedLead.whatsapp) {
        normalizedLead.whatsapp = String(normalizedLead.whatsapp).replace(/\D/g, "")
      }

      if (normalizedLead) {
        leadsToInsert.push({
          full_name: normalizedLead.full_name,
          whatsapp: normalizedLead.whatsapp,
          company_name: normalizedLead.company_name,
          origin: normalizedLead.origin,
        })
      }
    }

    if (leadsToInsert.length === 0) {
      console.warn("No leads found in payload")
      return NextResponse.json({ message: 'No valid leads found in body' }, { status: 400, headers: corsHeaders })
    }

    const rpcPayload = leadsToInsert.map(l => ({
      full_name: l.full_name,
      whatsapp: l.whatsapp,
      company_name: l.company_name,
      origin: l.origin
    }))

    const { data: rpcData, error: rpcError } = await supabase.rpc('process_webhook_leads', {
      p_token: token,
      p_leads: rpcPayload
    })

    if (rpcError) {
      console.error('RPC Error:', rpcError)
      return NextResponse.json({ error: `Database Error: ${rpcError.message}` }, { status: 500, headers: corsHeaders })
    }

    if (rpcData && !rpcData.success) {
      console.error('RPC logic failed:', rpcData.error)
      return NextResponse.json({ error: rpcData.error }, { status: 403, headers: corsHeaders })
    }

    console.log(`Success! Inserted ${rpcData?.count || 0} leads via RPC.`)
    return NextResponse.json({ success: true, count: rpcData?.count }, { headers: corsHeaders })

  } catch (err: any) {
    console.error('Fatal Webhook Error:', err)
    return NextResponse.json({ error: `Internal Server Error: ${err.message}` }, { status: 500, headers: corsHeaders })
  }
}

// =============================================
// Handle incoming WhatsApp messages
// =============================================
async function handleIncomingMessage(token: string, body: any) {
  try {
    // Find user by webhook_token
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('webhook_token', token)
      .single()

    if (profileError || !profile) {
      console.error("Invalid token for incoming message:", token)
      return
    }

    const userId = profile.id

    // Extract message data from different UazAPI event formats
    let senderPhone = ''
    let senderName = ''
    let messageContent = ''
    let messageId = ''
    let fromMe = false

    // Format 1: UazAPI standard event
    if (body.data?.key) {
      const key = body.data.key
      fromMe = key.fromMe === true
      senderPhone = (key.remoteJid || '').replace('@s.whatsapp.net', '').replace(/\D/g, '')
      messageId = key.id || ''

      const msg = body.data.message
      messageContent =
        msg?.conversation ||
        msg?.extendedTextMessage?.text ||
        msg?.imageMessage?.caption ||
        msg?.documentMessage?.caption ||
        '[Mídia]'

      senderName = body.data?.pushName || body.data?.notifyName || senderPhone
    }
    // Format 2: simpler structure
    else if (body.remoteJid) {
      fromMe = body.fromMe === true
      senderPhone = body.remoteJid.replace('@s.whatsapp.net', '').replace(/\D/g, '')
      senderName = body.pushName || senderPhone
      messageContent = body.message?.conversation || body.text || '[Mensagem]'
      messageId = body.id || ''
    }
    // Format 3: n8n Custom Subflow Webhook
    else if (body.source === 'n8n' || body.phone) {
      fromMe = body.fromMe === true
      senderPhone = String(body.phone || body.contact_phone || '').replace(/\D/g, '')
      senderName = body.name || body.contact_name || senderPhone
      messageContent = body.message || body.text || body.content || '[Mensagem]'
      messageId = body.messageId || body.id || `n8n_${Date.now()}`
    }

    if (!senderPhone || (!messageContent && !body.data?.message) || fromMe) {
      // Ignore outgoing messages from UazAPI events (we save them ourselves)
      console.log("Skipping: fromMe or missing data")
      return
    }

    // Upsert conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .upsert(
        {
          user_id: userId,
          contact_phone: senderPhone,
          contact_name: senderName,
          last_message: messageContent,
          last_message_at: new Date().toISOString(),
          unread_count: 1, // Will be incremented below
          is_open: true,
        },
        {
          onConflict: 'user_id,contact_phone',
          ignoreDuplicates: false,
        }
      )
      .select()
      .single()

    if (convError || !conversation) {
      console.error("Error upserting conversation:", convError)
      return
    }

    // Increment unread_count
    await supabase.rpc('increment_unread', { conv_id: conversation.id })

    // Insert message
    await supabase.from('messages').insert({
      conversation_id: conversation.id,
      user_id: userId,
      content: messageContent,
      from_me: false,
      whatsapp_message_id: messageId,
      status: 'received',
    })

    console.log(`Message from ${senderPhone} saved to conversation ${conversation.id}`)
  } catch (err) {
    console.error("Error handling incoming message:", err)
  }
}
