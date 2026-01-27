
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initializing Supabase Client with Service Role Key to bypass RLS for token lookup
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
// We MUST use the service role key to query profiles by webhook_token securely
// If not available, we can't secure the webhook properly with current constraints
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY // Fallback to ANON (not secure for token lookup if RLS blocks it) -> In production should be SERVICE_ROLE

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
  { params }: { params: Promise<{ token: string }> } // Params is a Promise in Next.js 15+
) {
  console.log("Webhook POST received")
  try {
    const { token } = await params
    console.log("Token received:", token)

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400, headers: corsHeaders })
    }

    // Check Key
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.warn("WARNING: Using ANON KEY for Webhook. This will likely fail RLS checks. Please add SUPABASE_SERVICE_ROLE_KEY to .env.local")
    }

    // 1. Validate Token & User
    // 1. Validate Token & User Check skipped here to avoid RLS issues with Anon Key.
    // We will let the RPC function (Security Definer) handle the token validation securely.

    const body = await req.json()
    console.log("Webhook Body:", JSON.stringify(body).slice(0, 200)) // Log first 200 chars
    const leadsToInsert: any[] = []

    // 2. Identify and Normalize (Adapter Pattern)

    // CASE 1: Instagram (Array of objects with user info)
    // Structure guess: [{ username: "...", full_name: "...", ... }] or { ... }
    const items = Array.isArray(body) ? body : (body.items || [body])

    for (const item of items) {
      // Logic to detect source
      let normalizedLead: any = null

      // Check: Google Maps
      if (item.nome_empresa || item.address || item.category) {
        normalizedLead = {
          full_name: item.nome_empresa || "Sem nome",
          whatsapp: item.telefone || item.phone || null,
          company_name: item.nome_empresa || null,
          origin: "Google Maps"
        }
      }
      // Check: CNPJ (Usually has razao_social)
      else if (item.razao_social || item.cnpj) {
        normalizedLead = {
          full_name: item.razao_social || item.nome_fantasia || "Sem Razão Social",
          whatsapp: item.telefone || item.celular || null,
          company_name: item.nome_fantasia || item.razao_social || null,
          origin: "Extração CNPJ"
        }
      }
      // Check: Instagram (full_name, username, biography)
      else if (item.username || item.full_name || item.biography) {
        normalizedLead = {
          full_name: item.full_name || item.username || "Sem nome",
          whatsapp: item.phone || item.contato || item.whatsapp || null, // Instagram extractors often lack phone
          company_name: item.category_name || item.biography || null,
          origin: "Instagram"
        }
      }
      // Fallback
      else {
        normalizedLead = {
          full_name: item.name || item.nome || "Lead Desconhecido",
          whatsapp: item.phone || item.telefone || item.whatsapp || null,
          company_name: item.company || item.empresa || null,
          origin: "Outros"
        }
      }

      // Clean Phone
      if (normalizedLead.whatsapp) {
        normalizedLead.whatsapp = String(normalizedLead.whatsapp).replace(/\D/g, "")
      }

      if (normalizedLead) {
        leadsToInsert.push({
          full_name: normalizedLead.full_name,
          whatsapp: normalizedLead.whatsapp,
          company_name: normalizedLead.company_name,
          origin: normalizedLead.origin,
          // folder and user_id are handled by RPC or defaults
        })
      }
    }

    if (leadsToInsert.length === 0) {
      console.warn("No leads found in payload")
      return NextResponse.json({ message: 'No valid leads found in body' }, { status: 400, headers: corsHeaders })
    }

    // 3. Insert into Database using RPC (Bypass RLS)
    // We pass the normalized array to the Postgres function

    // Simplification for RPC: remove fields irrelevant to the DB insert if needed, 
    // but the RPC simply extracts what it needs.
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

    // Check application-level error from RPC
    if (rpcData && !rpcData.success) {
      console.error('RPC logic failed:', rpcData.error)
      return NextResponse.json({ error: rpcData.error }, { status: 403, headers: corsHeaders }) // Likely invalid token
    }

    console.log(`Success! Inserted ${rpcData?.count || 0} leads via RPC.`)
    return NextResponse.json({ success: true, count: rpcData?.count }, { headers: corsHeaders })

  } catch (err: any) {
    console.error('Fatal Webhook Error:', err)
    return NextResponse.json({ error: `Internal Server Error: ${err.message}` }, { status: 500, headers: corsHeaders })
  }
}
