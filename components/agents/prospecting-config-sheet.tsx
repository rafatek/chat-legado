"use client"

import { useEffect, useState } from "react"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetFooter,
    SheetClose
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Save, Sparkles, Info, Plus, Trash2, Check } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface ProspectingConfigSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

const TONES = [
    { id: 'formal', label: 'Formal', color: 'blue', classes: 'hover:border-blue-500/50 hover:text-blue-400' },
    { id: 'informal', label: 'Informal', color: 'green', classes: 'hover:border-green-500/50 hover:text-green-400' },
    { id: 'entusiasta', label: 'Entusiasta', color: 'yellow', classes: 'hover:border-yellow-500/50 hover:text-yellow-400' },
    { id: 'direto', label: 'Direto', color: 'red', classes: 'hover:border-red-500/50 hover:text-red-400' },
    { id: 'persuasivo', label: 'Persuasivo', color: 'purple', classes: 'hover:border-purple-500/50 hover:text-purple-400' },
    { id: 'empatico', label: 'Empático', color: 'cyan', classes: 'hover:border-cyan-500/50 hover:text-cyan-400' }
]

export function ProspectingConfigSheet({ open, onOpenChange }: ProspectingConfigSheetProps) {
    const [loading, setLoading] = useState(false)
    const [fetching, setFetching] = useState(true)

    // Form State
    const [promptText, setPromptText] = useState("")
    const [selectedTones, setSelectedTones] = useState<string[]>([])
    const [customMessages, setCustomMessages] = useState<string[]>([])
    const [newMessage, setNewMessage] = useState("")

    useEffect(() => {
        if (open) {
            fetchConfig()
        }
    }, [open])

    const fetchConfig = async () => {
        setFetching(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data, error } = await supabase
                .from('prospecting_configs')
                .select('*')
                .eq('user_id', user.id)
                .single()

            if (error && error.code !== 'PGRST116') {
                console.error("Error fetching config:", error)
                toast.error("Erro ao carregar configurações")
            }

            if (data) {
                setPromptText(data.agent_prompt || "")

                // Robust parsing for personality
                let tones: string[] = []
                if (Array.isArray(data.personality)) {
                    tones = data.personality
                } else if (typeof data.personality === 'string') {
                    try {
                        const parsed = JSON.parse(data.personality)
                        if (Array.isArray(parsed)) tones = parsed
                    } catch (e) {
                        // Attempt to handle postgres array format {a,b} just in case
                        const str = data.personality as string
                        if (str.startsWith('{') && str.endsWith('}')) {
                            tones = str.slice(1, -1).split(',')
                        } else {
                            // Fallback: treat as single value if not empty
                            if (str) tones = [str]
                        }
                    }
                }
                setSelectedTones(tones)

                // Robust parsing for messages
                let msgs: string[] = []
                if (Array.isArray(data.default_messages)) {
                    msgs = data.default_messages
                } else if (typeof data.default_messages === 'string') {
                    try {
                        const parsed = JSON.parse(data.default_messages)
                        if (Array.isArray(parsed)) msgs = parsed
                    } catch {
                        // ignore
                    }
                }
                setCustomMessages(msgs)

            } else {
                // Defaults
                setPromptText("")
                setSelectedTones([])
                setCustomMessages([])
            }
        } catch (err) {
            console.error(err)
        } finally {
            setFetching(false)
        }
    }

    const toggleTone = (toneId: string) => {
        setSelectedTones(prev =>
            prev.includes(toneId)
                ? prev.filter(t => t !== toneId)
                : [...prev, toneId]
        )
    }

    const addMessage = () => {
        if (!newMessage.trim()) return
        setCustomMessages([...customMessages, newMessage.trim()])
        setNewMessage("")
    }

    const removeMessage = (index: number) => {
        setCustomMessages(customMessages.filter((_, i) => i !== index))
    }

    const handleSave = async () => {
        setLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                toast.error("Usuário não autenticado")
                return
            }

            // Logic: Is active if there are custom messages
            const isActive = customMessages.length > 0

            const payload = {
                user_id: user.id,
                agent_prompt: promptText,
                personality: selectedTones,
                default_messages: customMessages,
                is_active: isActive,
                updated_at: new Date().toISOString()
            }

            const { error } = await supabase
                .from('prospecting_configs')
                .upsert(payload, { onConflict: 'user_id' })

            if (error) throw error

            toast.success("Configuração salva com sucesso!")
            onOpenChange(false)
        } catch (error) {
            console.error("Error saving config:", JSON.stringify(error, null, 2))
            if (typeof error === 'object' && error !== null && 'message' in error) {
                toast.error(`Erro: ${(error as any).message}`)
            } else {
                toast.error("Erro ao salvar configuração")
            }
        } finally {
            setLoading(false)
        }
    }

    // Helper to get active styles based on color name
    const getActiveStyles = (color: string) => {
        switch (color) {
            case 'blue': return 'bg-blue-500/20 border-blue-500 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
            case 'green': return 'bg-green-500/20 border-green-500 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.2)]'
            case 'yellow': return 'bg-yellow-500/20 border-yellow-500 text-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.2)]'
            case 'red': return 'bg-red-500/20 border-red-500 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
            case 'purple': return 'bg-purple-500/20 border-purple-500 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
            case 'cyan': return 'bg-cyan-500/20 border-cyan-500 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
            default: return 'bg-primary/20 border-primary text-primary'
        }
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="w-[calc(100%-16rem)] max-w-none sm:max-w-none border-l border-white/10 bg-[#0A0A0C]/90 backdrop-blur-xl p-0 shadow-2xl transition-all duration-500 ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right"
                style={{ marginLeft: '16rem' }}
            >
                <div className="h-full overflow-y-auto p-6 scrollbar-hide">
                    <SheetHeader className="mb-8 border-b border-white/5 pb-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                                <Sparkles className="h-5 w-5" />
                            </div>
                            <div>
                                <SheetTitle className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent">Agente de Prospecção</SheetTitle>
                                <SheetDescription className="text-lg mt-1">
                                    Configure a abordagem inicial do seu agente Outbound.
                                </SheetDescription>
                            </div>
                        </div>
                    </SheetHeader>

                    {fetching ? (
                        <div className="flex justify-center py-20">
                            <Loader2 className="h-12 w-12 animate-spin text-emerald-500" />
                        </div>
                    ) : (
                        <div className="grid gap-8 py-4 max-w-5xl mx-auto">

                            {/* Card-like container within sheet */}
                            <div className="rounded-xl border border-emerald-500/20 bg-gradient-to-b from-card to-card/50 p-6 shadow-lg relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-30 pointer-events-none">
                                    <Sparkles className="h-24 w-24 text-emerald-500/5 -rotate-12" />
                                </div>

                                <div className="space-y-8 relative z-10">

                                    {/* 1. Tom de Voz */}
                                    <div className="space-y-3">
                                        <label className="text-sm font-medium leading-none text-emerald-100">
                                            Tom de Chat (Personalidade)
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {TONES.map(tone => {
                                                const isSelected = selectedTones.includes(tone.id)
                                                return (
                                                    <button
                                                        key={tone.id}
                                                        onClick={() => toggleTone(tone.id)}
                                                        className={`
                                                            px-4 py-2 rounded-full text-sm font-medium transition-all border duration-300
                                                            ${isSelected
                                                                ? getActiveStyles(tone.color)
                                                                : `bg-black/20 border-white/10 text-muted-foreground hover:bg-white/5 hover:text-white ${tone.classes}`
                                                            }
                                                        `}
                                                    >
                                                        {isSelected && <Check className="w-3 h-3 inline-block mr-1.5" />}
                                                        {tone.label}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>

                                    {/* 2. Prompt */}
                                    <div className="space-y-3">
                                        <label className="text-sm font-medium leading-none flex justify-between items-center text-emerald-100">
                                            Prompt do Agente de Disparo
                                        </label>

                                        <Textarea
                                            className="min-h-[200px] resize-none font-mono text-sm bg-black/40 border-white/10 focus:border-emerald-500/50 p-6 leading-relaxed custom-scrollbar shadow-inner"
                                            placeholder="Descreva aqui como o agente deve abordar os leads..."
                                            value={promptText}
                                            onChange={(e) => setPromptText(e.target.value)}
                                        />

                                        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 flex gap-3 text-sm text-emerald-200/80 mt-4">
                                            <Info className="h-5 w-5 shrink-0 text-emerald-400" />
                                            <div className="space-y-1">
                                                <p className="font-medium text-emerald-400">Dica de Uso</p>
                                                <p>
                                                    Escolha o tom que mais combina com sua abordagem de prospecção. Acima o prompt será a base para o agente criar mensagens diferentes para abordar seus Leads.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 3. Modelos de Mensagem */}
                                    <div className="space-y-3 pt-4 border-t border-white/5">
                                        <label className="text-sm font-medium leading-none text-emerald-100 flex justify-between">
                                            Modelos de Mensagem Personalizados
                                            <span className="text-xs text-muted-foreground font-normal">
                                                *O agente também usará as mensagens para você testar quais têm mais resposta. Crie pelo menos 5 mensagens.
                                            </span>
                                        </label>

                                        <div className="flex gap-2">
                                            <Input
                                                placeholder="Ex: Olá, tudo bem?"
                                                value={newMessage}
                                                onChange={(e) => setNewMessage(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && addMessage()}
                                                className="bg-black/40 border-white/10 focus:border-emerald-500/50"
                                            />
                                            <Button onClick={addMessage} size="icon" className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0">
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </div>

                                        <div className="space-y-2 mt-2">
                                            {customMessages.length === 0 && (
                                                <p className="text-sm text-muted-foreground italic text-center py-4 bg-white/5 rounded-lg border border-dashed border-white/10">
                                                    Nenhuma mensagem padrão configurada.
                                                </p>
                                            )}
                                            {customMessages.map((msg, idx) => (
                                                <div key={idx} className="group flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5 hover:border-emerald-500/30 transition-colors">
                                                    <span className="text-sm text-gray-300">{msg}</span>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => removeMessage(idx)}
                                                        className="text-muted-foreground hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <SheetFooter className="mt-8 gap-4 border-t border-white/5 pt-6">
                        <SheetClose asChild>
                            <Button variant="ghost" size="lg" disabled={loading} className="text-muted-foreground hover:text-white">Cancelar</Button>
                        </SheetClose>
                        <Button onClick={handleSave} disabled={loading || fetching} size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[200px] shadow-lg shadow-emerald-500/20">
                            {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                            Salvar Configuração
                        </Button>
                    </SheetFooter>
                </div>
            </SheetContent>
        </Sheet>
    )
}
