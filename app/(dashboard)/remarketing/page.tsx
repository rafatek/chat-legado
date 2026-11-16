"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import {
  Target,
  Save,
  Loader2,
  BrainCircuit,
  Power,
  Clock,
  Plus,
  Trash2,
  Shield,
  Zap,
  Info,
  CheckCircle2,
  Calendar,
  RefreshCw,
  Phone,
  User,
  AlertCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  getRemarketingConfig,
  saveRemarketingConfig,
  getUpcomingRemarketingQueue,
  cancelLeadRemarketingQueue,
  TimeRule,
  RemarketingConfigData
} from "@/lib/actions/remarketing"

export default function RemarketingPage() {
  const [config, setConfig] = useState<RemarketingConfigData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Queue state
  const [queue, setQueue] = useState<any[]>([])
  const [totalQueueCount, setTotalQueueCount] = useState<number>(0)
  const [isLoadingQueue, setIsLoadingQueue] = useState(false)
  const [cancelingId, setCancelingId] = useState<string | null>(null)

  // New Rule inputs
  const [newDays, setNewDays] = useState<string>("0")
  const [newHours, setNewHours] = useState<string>("2")
  const [newMinutes, setNewMinutes] = useState<string>("0")

  // Carrega configuração
  const loadConfig = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await getRemarketingConfig()
      if (res.success && res.data) {
        setConfig(res.data)
      } else {
        toast.error("Erro ao carregar configurações: " + res.error)
      }
    } catch (err: any) {
      toast.error("Falha ao carregar: " + err.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Carrega fila de agendamentos
  const loadQueue = useCallback(async () => {
    setIsLoadingQueue(true)
    try {
      const res = await getUpcomingRemarketingQueue()
      if (res.success && res.data) {
        setQueue(res.data)
        setTotalQueueCount(res.totalCount ?? res.data.length)
      }
    } catch (e) {
      console.warn("Erro ao buscar fila:", e)
    } finally {
      setIsLoadingQueue(false)
    }
  }, [])

  useEffect(() => {
    loadConfig()
    loadQueue()
  }, [loadConfig, loadQueue])

  // Salvar configurações
  const handleSave = async () => {
    if (!config) return
    setIsSaving(true)
    try {
      const res = await saveRemarketingConfig({
        is_active: config.is_active,
        agent_mode: config.agent_mode,
        time_rules: config.time_rules,
        ai_prompt: config.ai_prompt
      })

      if (res.success) {
        toast.success("Configurações de Remarketing salvas com sucesso!")
      } else {
        toast.error("Erro ao salvar: " + res.error)
      }
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  // Adicionar Regra de Tempo
  const handleAddTimeRule = () => {
    if (!config) return
    const days = parseInt(newDays, 10) || 0
    const hours = parseInt(newHours, 10) || 0
    const minutes = parseInt(newMinutes, 10) || 0

    const totalMinutes = (days * 1440) + (hours * 60) + minutes
    if (totalMinutes <= 0) {
      toast.error("O tempo da regra deve ser maior que zero minutos.")
      return
    }

    const parts: string[] = []
    if (days > 0) parts.push(`${days} ${days === 1 ? 'dia' : 'dias'}`)
    if (hours > 0) parts.push(`${hours} ${hours === 1 ? 'hora' : 'horas'}`)
    if (minutes > 0) parts.push(`${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`)
    const label = `Após ${parts.join(" e ")}`

    const newRule: TimeRule = {
      id: String(Date.now()),
      days,
      hours,
      minutes,
      label
    }

    const updatedRules = [...(config.time_rules || []), newRule]
    setConfig({
      ...config,
      time_rules: updatedRules
    })

    // Reset inputs
    setNewDays("0")
    setNewHours("1")
    setNewMinutes("0")
    toast.success(`Regra "${label}" adicionada! Lembre-se de salvar.`)
  }

  // Remover Regra de Tempo
  const handleRemoveTimeRule = (indexToRemove: number) => {
    if (!config) return
    const updated = config.time_rules.filter((_, idx) => idx !== indexToRemove)
    setConfig({
      ...config,
      time_rules: updated
    })
  }

  // Cancelar agendamento de lead da fila
  const handleCancelLeadQueue = async (leadId: string, itemQueueId: string) => {
    if (!config?.user_id) return
    setCancelingId(itemQueueId)
    try {
      const res = await cancelLeadRemarketingQueue(leadId, config.user_id)
      if (res.success) {
        toast.success("Remarketing cancelado e agendamentos futuros removidos!")
        setQueue(prev => prev.filter(q => q.lead_id !== leadId && q.id !== itemQueueId))
      } else {
        toast.error("Erro ao cancelar: " + res.error)
      }
    } catch (e: any) {
      toast.error("Falha ao cancelar: " + e.message)
    } finally {
      setCancelingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-[#00A3FF]" />
      </div>
    )
  }

  if (!config) return null

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-y-auto custom-scrollbar text-foreground">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 md:p-8 gap-4 border-b border-border flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Target className="h-6 w-6 text-[#00A3FF]" />
            Configuração de Remarketing
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Defina o comportamento do agente, intervalos de tempo e instruções de reengajamento.
          </p>
        </div>

        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-[#00A3FF] hover:bg-[#00A3FF]/80 text-white gap-2 h-10 px-5 flex-shrink-0 font-semibold shadow-[0_0_15px_rgba(0,163,255,0.4)]"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar Configurações
        </Button>
      </div>

      <div className="p-6 md:p-8 space-y-8 max-w-5xl mx-auto w-full">
        {/* ── 1. Controle Principal (Chave Geral) ────────────────────────────── */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Power className="h-5 w-5 text-[#00A3FF]" />
                <h2 className="text-base font-semibold text-foreground">Serviço de Remarketing</h2>
              </div>
              <p className="text-xs text-muted-foreground">
                Chave mestre para ativar ou desativar o fluxo de remarketing para todos os seus leads.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={cn("text-xs font-bold uppercase", config.is_active ? "text-emerald-500" : "text-muted-foreground")}>
                {config.is_active ? "ATIVO" : "INATIVO"}
              </span>
              <Switch
                checked={config.is_active}
                onCheckedChange={(v) => setConfig({ ...config, is_active: v })}
                className="data-[state=checked]:bg-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* ── 2. Modo do Agente (Passivo vs Proativo) ───────────────────────── */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              Modo de Operação do Agente
            </h2>
            <p className="text-xs text-muted-foreground">
              Escolha como os leads entrarão na sua régua de remarketing.
            </p>
          </div>

          {/* Seletor Toggle tipo Admin */}
          <div className="flex p-1 bg-black/60 rounded-xl border border-zinc-800 w-full sm:w-fit">
            <button
              type="button"
              onClick={() => setConfig({ ...config, agent_mode: "passive" })}
              className={cn(
                "flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300",
                config.agent_mode === "passive"
                  ? "bg-zinc-800 text-white shadow-md border border-zinc-700"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              <Shield className="w-4 h-4 text-amber-400" />
              Agente Passivo
            </button>
            <button
              type="button"
              onClick={() => setConfig({ ...config, agent_mode: "proactive" })}
              className={cn(
                "flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300",
                config.agent_mode === "proactive"
                  ? "bg-[#00A3FF] text-white shadow-[0_0_15px_rgba(0,163,255,0.4)]"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              <Zap className="w-4 h-4 text-white" />
              Agente Proativo
            </button>
          </div>

          {/* Card explicativo do modo selecionado */}
          {config.agent_mode === "passive" ? (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex gap-3 items-start">
              <Shield className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <p className="font-semibold text-amber-300">Modo Passivo Selecionado</p>
                <p className="text-muted-foreground">
                  Nenhum lead recebe mensagens automáticas por padrão. Todos entram com o RMK desativado. 
                  Você escolhe na tela de Atendimento, durante a conversa, quando quer ativar o remarketing daquele lead específico clicando no botão <strong>"RMK"</strong>.
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 flex gap-3 items-start">
              <Zap className="h-5 w-5 text-[#00A3FF] shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <p className="font-semibold text-blue-300">Modo Proativo Selecionado</p>
                <p className="text-muted-foreground">
                  <strong>Todos os novos leads criados a partir de agora</strong> entram automaticamente na sua régua de disparos seguindo as regras de horário abaixo. 
                  Se você não quiser que um lead específico continue no fluxo, basta clicar no botão "RMK" dele no atendimento para cancelar os agendamentos futuros.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── 3. Regras de Horários (Régua de Disparos) ──────────────────────── */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Clock className="h-5 w-5 text-[#00A3FF]" />
              Regras de Horários dos Disparos
            </h2>
            <p className="text-xs text-muted-foreground">
              Configure as etapas de tempo calculadas a partir do momento da ativação do lead.
            </p>
          </div>

          {/* Lista de regras cadastradas */}
          <div className="space-y-3">
            {config.time_rules && config.time_rules.length > 0 ? (
              config.time_rules.map((rule, idx) => (
                <div
                  key={rule.id || idx}
                  className="flex items-center justify-between p-3.5 bg-black/40 border border-zinc-800 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#00A3FF]/10 text-[#00A3FF] font-bold text-xs border border-[#00A3FF]/20">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-white">{rule.label}</p>
                      <p className="text-[11px] text-zinc-400">
                        {rule.days > 0 ? `${rule.days}d ` : ""}
                        {rule.hours > 0 ? `${rule.hours}h ` : ""}
                        {rule.minutes > 0 ? `${rule.minutes}min ` : ""}
                        após o momento da ativação
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveTimeRule(idx)}
                    className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10 h-8 w-8 p-0"
                    title="Remover etapa"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-zinc-800 text-center text-xs text-zinc-500">
                Nenhuma regra cadastrada. Adicione pelo menos uma etapa abaixo.
              </div>
            )}
          </div>

          {/* Form para adicionar nova regra */}
          <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-4">
            <Label className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Adicionar Nova Etapa de Tempo
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <div>
                <Label className="text-[11px] text-zinc-400">Dias</Label>
                <Input
                  type="number"
                  min="0"
                  max="365"
                  value={newDays}
                  onChange={(e) => setNewDays(e.target.value)}
                  className="bg-black border-zinc-700 h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-[11px] text-zinc-400">Horas</Label>
                <Input
                  type="number"
                  min="0"
                  max="23"
                  value={newHours}
                  onChange={(e) => setNewHours(e.target.value)}
                  className="bg-black border-zinc-700 h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-[11px] text-zinc-400">Minutos</Label>
                <Input
                  type="number"
                  min="0"
                  max="59"
                  value={newMinutes}
                  onChange={(e) => setNewMinutes(e.target.value)}
                  className="bg-black border-zinc-700 h-9 text-sm"
                />
              </div>
              <Button
                type="button"
                onClick={handleAddTimeRule}
                className="h-9 bg-zinc-800 hover:bg-zinc-700 text-white font-medium border border-zinc-700 gap-1.5"
              >
                <Plus className="h-4 w-4" /> Adicionar
              </Button>
            </div>
          </div>
        </div>

        {/* ── 4. Cérebro da IA (Instruções e Prompt) ────────────────────────── */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <BrainCircuit className="h-5 w-5 text-[#00A3FF]" />
              Cérebro da IA (Instruções do Prompt)
            </h2>
            <p className="text-xs text-muted-foreground">
              Estas instruções orientam a inteligência artificial na hora de gerar a mensagem personalizada de remarketing para cada lead.
            </p>
          </div>

          <Textarea
            rows={5}
            value={config.ai_prompt}
            onChange={(e) => setConfig({ ...config, ai_prompt: e.target.value })}
            placeholder="Ex: Você é um consultor atencioso. O cliente parou de responder. Pergunte de forma leve se ele conseguiu analisar a proposta..."
            className="bg-black/50 border-zinc-800 font-mono text-xs leading-relaxed"
          />
        </div>

        {/* ── 5. Fila de Agendamentos em Tempo Real ─────────────────────────── */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-[#00A3FF]" />
                  Fila de Disparos Programados
                </h2>
                {totalQueueCount > 0 && (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                    {totalQueueCount > 20 ? `Próximos 20 de ${totalQueueCount}` : `${totalQueueCount} ${totalQueueCount === 1 ? 'agendado' : 'agendados'}`}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Próximos leads com horários agendados aguardando o momento exato do disparo automático.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={loadQueue}
              disabled={isLoadingQueue}
              className="border-zinc-700 bg-zinc-900/60 hover:bg-zinc-800 h-8 gap-1.5 text-xs text-zinc-300 self-start sm:self-auto"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isLoadingQueue && "animate-spin")} />
              Atualizar Fila
            </Button>
          </div>

          {queue.length > 0 ? (
            <div className="rounded-xl border border-zinc-800 overflow-hidden bg-black/40">
              <div className="divide-y divide-zinc-800/80">
                {queue.map((item) => (
                  <div key={item.id} className="p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">
                          {item.display_name || item.leads?.full_name || "Lead"}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono font-medium">
                          Etapa {item.step}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-zinc-400 font-mono text-[11px]">
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {item.display_phone || item.leads?.whatsapp || "Sem número"}
                        </span>
                        <span className="flex items-center gap-1 text-amber-300">
                          <Clock className="h-3 w-3" />
                          {new Date(item.scheduled_at).toLocaleString("pt-BR")}
                        </span>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={cancelingId === item.id}
                      onClick={() => handleCancelLeadQueue(item.lead_id, item.id)}
                      className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10 h-7 text-xs gap-1"
                    >
                      {cancelingId === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                      Cancelar
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-xl border border-dashed border-zinc-800 text-center text-xs text-zinc-500 space-y-1">
              <CheckCircle2 className="h-6 w-6 text-zinc-600 mx-auto" />
              <p>Nenhum disparo pendente na fila neste momento.</p>
              <p className="text-[11px] text-zinc-600">
                Ative o RMK de um lead no Atendimento ou aguarde novos leads no modo Proativo.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
