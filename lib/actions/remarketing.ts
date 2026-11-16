"use server"

import { createClient } from "@/lib/supabase-server"
import { createAdminClient } from "@/lib/supabase-admin"
import { revalidatePath } from "next/cache"

export interface TimeRule {
  id: string
  days: number
  hours: number
  minutes: number
  label: string
}

export interface RemarketingConfigData {
  id?: string
  user_id: string
  is_active: boolean
  agent_mode: "passive" | "proactive"
  time_rules: TimeRule[]
  ai_prompt: string
  max_attempts?: number
}

const DEFAULT_TIME_RULES: TimeRule[] = [
  { id: "1", days: 0, hours: 0, minutes: 30, label: "Após 30 minutos" },
  { id: "2", days: 0, hours: 2, minutes: 0, label: "Após 2 horas" },
  { id: "3", days: 1, hours: 0, minutes: 0, label: "Após 1 dia" }
]

/**
 * Busca a configuração de remarketing do usuário autenticado
 */
export async function getRemarketingConfig(): Promise<{ success: boolean; data?: RemarketingConfigData; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Não autenticado" }
    }

    const { data, error } = await supabase
      .from("remarketing_configs")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()

    if (error && error.code !== "PGRST116") {
      return { success: false, error: error.message }
    }

    if (!data) {
      return {
        success: true,
        data: {
          user_id: user.id,
          is_active: false,
          agent_mode: "passive",
          time_rules: DEFAULT_TIME_RULES,
          ai_prompt: ""
        }
      }
    }

    return {
      success: true,
      data: {
        id: data.id,
        user_id: data.user_id,
        is_active: !!data.is_active,
        agent_mode: (data.agent_mode === "proactive" ? "proactive" : "passive"),
        time_rules: Array.isArray(data.time_rules) && data.time_rules.length > 0 ? data.time_rules : DEFAULT_TIME_RULES,
        ai_prompt: data.ai_prompt || "",
        max_attempts: data.max_attempts || 3
      }
    }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * Salva a configuração de remarketing
 */
export async function saveRemarketingConfig(payload: {
  is_active: boolean
  agent_mode: "passive" | "proactive"
  time_rules: TimeRule[]
  ai_prompt?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Não autenticado" }
    }

    const cleanRules = (payload.time_rules || []).map((rule, idx) => ({
      id: rule.id || String(idx + 1),
      days: Number(rule.days) || 0,
      hours: Number(rule.hours) || 0,
      minutes: Number(rule.minutes) || 0,
      label: rule.label || `Etapa ${idx + 1}`
    }))

    const { error } = await supabase
      .from("remarketing_configs")
      .upsert({
        user_id: user.id,
        is_active: payload.is_active,
        agent_mode: payload.agent_mode,
        time_rules: cleanRules,
        ai_prompt: payload.ai_prompt || "",
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id" })

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath("/remarketing")
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * Agenda os disparos de um lead com base nas regras de horário do usuário
 */
export async function scheduleLeadRemarketingQueue(leadId: string, userId: string) {
  try {
    const supabaseAdmin = await createAdminClient()

    // 🔒 Proteção IDOR: Garante que o lead pertence ao usuário
    const { data: leadCheck } = await supabaseAdmin
      .from("leads")
      .select("id")
      .eq("id", leadId)
      .eq("user_id", userId)
      .maybeSingle()

    if (!leadCheck) {
      return { success: false, error: "Lead não encontrado ou não pertence ao usuário." }
    }

    // 1. Busca configurações do usuário
    const { data: config } = await supabaseAdmin
      .from("remarketing_configs")
      .select("is_active, time_rules")
      .eq("user_id", userId)
      .maybeSingle()

    const timeRules: TimeRule[] = (config?.time_rules && Array.isArray(config.time_rules) && config.time_rules.length > 0)
      ? config.time_rules
      : DEFAULT_TIME_RULES

    // 2. Remove agendamentos pendentes anteriores do mesmo lead para não duplicar
    await supabaseAdmin
      .from("remarketing_queue")
      .delete()
      .eq("lead_id", leadId)
      .eq("user_id", userId)

    // 3. Calcula e insere cada linha de agendamento na fila
    const nowMs = Date.now()
    const queueRows = timeRules.map((rule, index) => {
      const days = Number(rule.days) || 0
      const hours = Number(rule.hours) || 0
      const minutes = Number(rule.minutes) || 0
      const totalMinutes = (days * 24 * 60) + (hours * 60) + minutes
      const scheduledMs = nowMs + (totalMinutes * 60 * 1000)

      return {
        user_id: userId,
        lead_id: leadId,
        step: index + 1,
        scheduled_at: new Date(scheduledMs).toISOString(),
        metadata: {
          label: rule.label || `Etapa ${index + 1}`,
          days,
          hours,
          minutes
        }
      }
    })

    if (queueRows.length > 0) {
      const { error: queueErr } = await supabaseAdmin
        .from("remarketing_queue")
        .insert(queueRows)

      if (queueErr) {
        console.error("Erro ao inserir na remarketing_queue:", queueErr)
      }
    }

    // 4. Marca o lead como ativo em remarketing_leads
    await supabaseAdmin
      .from("remarketing_leads")
      .upsert({
        lead_id: leadId,
        user_id: userId,
        rmk_enabled: true,
        remarketing_status: "none",
        remarketing_attempts: 0,
        last_remarketing_at: new Date().toISOString()
      }, { onConflict: "lead_id" })

    return { success: true, count: queueRows.length }
  } catch (err: any) {
    console.error("Erro em scheduleLeadRemarketingQueue:", err)
    return { success: false, error: err.message }
  }
}

/**
 * Cancela e APAGA todos os futuros remarketings de um lead
 */
export async function cancelLeadRemarketingQueue(leadId: string, explicitUserId?: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // 🔒 Proteção IDOR: Prioriza o usuário autenticado da sessão
    const effectiveUserId = user?.id || explicitUserId

    if (!effectiveUserId) {
      return { success: false, error: "Não autenticado" }
    }

    const supabaseAdmin = await createAdminClient()

    // 🔒 Proteção IDOR: Garante que o lead pertence ao usuário antes de alterar
    const { data: leadCheck } = await supabaseAdmin
      .from("leads")
      .select("id")
      .eq("id", leadId)
      .eq("user_id", effectiveUserId)
      .maybeSingle()

    if (!leadCheck) {
      return { success: false, error: "Lead não encontrado ou não pertence ao usuário." }
    }

    // 1. Apaga todos os agendamentos daquele lead na fila
    const { error: delErr } = await supabaseAdmin
      .from("remarketing_queue")
      .delete()
      .eq("lead_id", leadId)
      .eq("user_id", effectiveUserId)

    if (delErr) {
      console.error("Erro ao apagar da remarketing_queue:", delErr)
    }

    // 2. Atualiza remarketing_leads para rmk_enabled = false
    await supabaseAdmin
      .from("remarketing_leads")
      .upsert({
        lead_id: leadId,
        user_id: effectiveUserId,
        rmk_enabled: false,
        remarketing_status: "optout"
      }, { onConflict: "lead_id" })

    return { success: true }
  } catch (err: any) {
    console.error("Erro em cancelLeadRemarketingQueue:", err)
    return { success: false, error: err.message }
  }
}

/**
 * Ação chamada pelo botão 'RMK' na tela de atendimento
 */
export async function toggleLeadRemarketingAction(leadId: string, enable: boolean) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Não autenticado" }
    }

    if (enable) {
      return await scheduleLeadRemarketingQueue(leadId, user.id)
    } else {
      return await cancelLeadRemarketingQueue(leadId, user.id)
    }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * Acionado na criação de novos leads: se o usuário estiver no modo 'proactive', agenda automaticamente
 */
export async function triggerProactiveRemarketingForNewLead(leadId: string, userId: string) {
  try {
    const supabaseAdmin = await createAdminClient()

    const { data: config } = await supabaseAdmin
      .from("remarketing_configs")
      .select("is_active, agent_mode")
      .eq("user_id", userId)
      .maybeSingle()

    // Se não estiver ativo ou não for proativo, não agenda
    if (!config || !config.is_active || config.agent_mode !== "proactive") {
      return { scheduled: false, reason: "passive_or_inactive" }
    }

    console.log(`[Proactive RMK] Agendando automaticamente para o novo lead: ${leadId}`)
    await scheduleLeadRemarketingQueue(leadId, userId)
    return { scheduled: true }
  } catch (err: any) {
    console.error("Erro em triggerProactiveRemarketingForNewLead:", err)
    return { scheduled: false, error: err.message }
  }
}

function formatDisplayPhone(phone?: string) {
  if (!phone) return "Sem número"
  const digits = phone.replace(/\D/g, "")
  const local = digits.startsWith("55") && digits.length >= 12 ? digits.slice(2) : digits
  if (local.length === 11) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`
  }
  if (local.length === 10) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`
  }
  return phone
}

/**
 * Lista os agendamentos na fila para exibição no painel (limitado aos próximos 20)
 */
export async function getUpcomingRemarketingQueue(): Promise<{
  success: boolean
  data: any[]
  totalCount?: number
  error?: string
}> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { success: false, data: [], totalCount: 0 }

    const { data, count, error } = await supabase
      .from("remarketing_queue")
      .select(`
        id,
        step,
        scheduled_at,
        created_at,
        metadata,
        lead_id,
        leads:lead_id (
          id,
          full_name,
          whatsapp,
          conversation_id
        )
      `, { count: "exact" })
      .eq("user_id", user.id)
      .order("scheduled_at", { ascending: true })
      .limit(20)

    if (error) {
      return { success: false, error: error.message, data: [], totalCount: 0 }
    }

    const items = data || []

    // Coleta conversation_ids para resolver o nome real se o lead tiver nome genérico
    const convIdsToFetch = items
      .map((item: any) => item.leads?.conversation_id)
      .filter(Boolean)

    const convMap = new Map<string, string>()
    if (convIdsToFetch.length > 0) {
      const { data: convs } = await supabase
        .from("conversations")
        .select("id, contact_name")
        .in("id", convIdsToFetch)

      if (convs) {
        for (const c of convs) {
          if (c.contact_name) convMap.set(c.id, c.contact_name)
        }
      }
    }

    // Processa cada item com resolução inteligente de nome
    const processedData = items.map((item: any) => {
      const lead = item.leads || {}
      const rawName = (lead.full_name || "").trim()
      const convName = lead.conversation_id ? (convMap.get(lead.conversation_id) || "").trim() : ""
      const phone = (lead.whatsapp || "").trim()

      const isGeneric = (name: string) => {
        if (!name) return true
        const lower = name.toLowerCase()
        if (lower === "lead importado" || lower.includes("lead importado")) return true
        if (lower === "sem nome" || lower === "lead sem nome" || lower === "lead desconhecido") return true
        if (lower.includes("lead whatsapp") || lower.includes("lead externo")) return true
        if (/^\d+$/.test(lower)) return true
        if (phone && lower === phone.replace(/\D/g, "").toLowerCase()) return true
        return false
      }

      let displayName = rawName
      if (isGeneric(rawName)) {
        if (convName && !isGeneric(convName)) {
          displayName = convName
        } else if (phone) {
          const digits = phone.replace(/\D/g, "")
          const local = digits.startsWith("55") && digits.length >= 12 ? digits.slice(2) : digits
          if (local.length === 11) {
            displayName = `Contato (${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`
          } else if (local.length === 10) {
            displayName = `Contato (${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`
          } else {
            displayName = `Contato ${phone}`
          }
        } else {
          displayName = "Lead Sem Nome"
        }
      }

      return {
        ...item,
        display_name: displayName,
        display_phone: formatDisplayPhone(phone)
      }
    })

    return {
      success: true,
      data: processedData,
      totalCount: count ?? processedData.length
    }
  } catch (err: any) {
    return { success: false, error: err.message, data: [], totalCount: 0 }
  }
}

