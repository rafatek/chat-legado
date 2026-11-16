import { syncAndCleanupWhatsappInstances } from "@/lib/actions/whatsapp"

// Evita múltiplos timers ativos em ambiente de desenvolvimento (Hot Reload)
declare global {
  var __whatsappSyncTimerInitialized: boolean | undefined
}

const SYNC_INTERVAL_MS = 30 * 60 * 1000 // 30 minutos

export function startWhatsappSyncCron() {
  if (global.__whatsappSyncTimerInitialized) {
    return
  }

  // Apenas roda no ambiente de servidor Node.js
  if (typeof window !== "undefined" || process.env.NEXT_RUNTIME === "edge") {
    return
  }

  global.__whatsappSyncTimerInitialized = true

  console.log(`[WhatsApp Sync Cron] Agendador iniciado. Intervalo: 30 minutos.`)

  // Aguarda 15 segundos após o boot do servidor para a primeira verificação suave
  setTimeout(async () => {
    try {
      console.log(`[WhatsApp Sync Cron] Executando checagem e limpeza inicial de conexões...`)
      const res = await syncAndCleanupWhatsappInstances()
      if (res && res.success) {
        console.log(`[WhatsApp Sync Cron] Inicial concluída: ${res.connectedCount} ativas | ${res.deletedCount} desconectadas excluídas | Restantes: ${res.remainingTotal}.`)
      }
    } catch (e: any) {
      console.warn(`[WhatsApp Sync Cron] Aviso na checagem inicial:`, e.message)
    }
  }, 15000)

  // Intervalo recorrente a cada 30 minutos
  setInterval(async () => {
    try {
      console.log(`[WhatsApp Sync Cron] Executando rotina periódica de sincronização e limpeza...`)
      const res = await syncAndCleanupWhatsappInstances()
      if (res && res.success) {
        console.log(`[WhatsApp Sync Cron] Periódica concluída: ${res.connectedCount} ativas | ${res.deletedCount} desconectadas excluídas | Restantes: ${res.remainingTotal}.`)
      }
    } catch (e: any) {
      console.error(`[WhatsApp Sync Cron] Erro na rotina periódica:`, e)
    }
  }, SYNC_INTERVAL_MS)
}

