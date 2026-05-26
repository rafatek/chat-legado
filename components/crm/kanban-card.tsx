"use client"

import { useState, useEffect } from "react"
import { Draggable } from "@hello-pangea/dnd"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Lead, Label as KanbanLabel } from "@/types/kanban"
import { MessageSquare, MapPin, Instagram, FileText, CheckCircle2, Pencil, Loader2, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface KanbanCardProps {
    lead: Lead
    index: number
    availableLabels?: KanbanLabel[]
}

function OriginBadge({ origin }: { origin: string }) {
    const icons: Record<string, React.ReactNode> = {
        "google maps": <MapPin className="h-3 w-3" />,
        "instagram": <Instagram className="h-3 w-3" />,
        "extração cnpj": <FileText className="h-3 w-3" />,
    }

    // Normalize origin key to lower case for matching
    const key = origin?.toLowerCase() || ""
    const icon = icons[key] || <FileText className="h-3 w-3" />

    const colors: Record<string, string> = {
        "google maps": "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
        "instagram": "bg-pink-500/10 text-pink-500 border-pink-500/20",
        "extração cnpj": "bg-red-500/10 text-red-500 border-red-500/20",
    }

    const colorClass = colors[key] || "bg-gray-500/10 text-gray-500 border-gray-500/20"

    return (
        <Badge variant="outline" className={`gap-1 ${colorClass}`}>
            {icon}
            <span className="capitalize">{origin}</span>
        </Badge>
    )
}

export function KanbanCard({ lead, index, availableLabels = [] }: KanbanCardProps) {
    const router = useRouter()
    
    // Edit state
    const [isEditOpen, setIsEditOpen] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [editData, setEditData] = useState({
        full_name: lead.full_name,
        valor: lead.valor !== undefined && lead.valor !== null ? lead.valor.toString() : (lead.value ? (lead.value / 100).toString() : "")
    })
    const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([])

    useEffect(() => {
        if (isEditOpen) {
            setEditData({
                full_name: lead.full_name,
                valor: lead.valor !== undefined && lead.valor !== null ? lead.valor.toString() : (lead.value ? (lead.value / 100).toString() : "")
            })
            setSelectedLabelIds(lead.labels?.map(l => l.id) || [])
        }
    }, [isEditOpen, lead])

    const handleWhatsAppClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (lead.whatsapp) {
            const cleanNumber = lead.whatsapp.replace(/\D/g, '')
            router.push(`/atendimento?phone=${cleanNumber}&name=${encodeURIComponent(lead.full_name)}`)
        } else {
            router.push('/atendimento')
        }
    }

    const handleSave = async () => {
        if (!editData.full_name) {
            toast.warning("O nome não pode ficar vazio")
            return
        }

        setIsSaving(true)
        try {
            const numericValue = editData.valor ? parseFloat(editData.valor.replace(',', '.')) : null

            // 1. Atualiza dados principais
            const { error: updateError } = await supabase
                .from('leads')
                .update({ 
                    full_name: editData.full_name,
                    valor: numericValue
                })
                .eq('id', lead.id)

            if (updateError) throw updateError

            // 2. Atualiza etiquetas vinculadas (lead_labels)
            const currentLabelIds = lead.labels?.map(l => l.id) || []
            
            const labelsToAdd = selectedLabelIds.filter(id => !currentLabelIds.includes(id))
            const labelsToRemove = currentLabelIds.filter(id => !selectedLabelIds.includes(id))

            if (labelsToAdd.length > 0) {
                const inserts = labelsToAdd.map(labelId => ({
                    lead_id: lead.id,
                    label_id: labelId
                }))
                const { error: insertError } = await supabase.from('lead_labels').insert(inserts)
                if (insertError) throw insertError
            }

            if (labelsToRemove.length > 0) {
                const { error: deleteError } = await supabase
                    .from('lead_labels')
                    .delete()
                    .eq('lead_id', lead.id)
                    .in('label_id', labelsToRemove)
                if (deleteError) throw deleteError
            }

            toast.success("Lead atualizado com sucesso!")
            setIsEditOpen(false)
            router.refresh()
        } catch (error) {
            console.error("Erro ao atualizar lead:", error)
            toast.error("Erro ao atualizar o lead.")
        } finally {
            setIsSaving(false)
        }
    }

    const handleDeleteLead = async () => {
        const confirmDelete = window.confirm(
            "Tem certeza que deseja apagar este contato? Todas as mensagens e dados do lead serão perdidos permanentemente."
        )
        if (!confirmDelete) return

        setIsDeleting(true)
        try {
            const { data: { session } } = await supabase.auth.getSession()

            // Busca o conversation_id vinculado ao lead
            const { data: leadData } = await supabase
                .from('leads')
                .select('conversation_id')
                .eq('id', lead.id)
                .single()

            if (leadData?.conversation_id) {
                // Deleta via API server-side (bypassa RLS)
                const res = await fetch('/api/contacts/delete', {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session?.access_token || ''}`,
                    },
                    body: JSON.stringify({ conversation_id: leadData.conversation_id }),
                })
                const data = await res.json()
                if (!res.ok) {
                    toast.error(data.error || 'Erro ao apagar o contato.')
                    return
                }
            } else {
                // Lead sem conversa — apaga diretamente
                const { error } = await supabase.from('leads').delete().eq('id', lead.id)
                if (error) throw error
            }

            toast.success('Contato apagado com sucesso!')
            setIsEditOpen(false)
            router.refresh()
        } catch (err: any) {
            console.error('Erro ao apagar lead:', err)
            toast.error('Erro ao apagar o contato.')
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <>
            <Draggable draggableId={lead.id} index={index}>
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={`
                group relative flex flex-col gap-3 rounded-xl border border-white/5 bg-[#111114] p-4 
                shadow-sm transition-all hover:border-primary/50 hover:shadow-md
                ${snapshot.isDragging ? "z-50 border-primary/50 shadow-xl rotate-2" : ""}
            `}
                        style={provided.draggableProps.style}
                    >
                        {/* Header: Origin & Labels */}
                        <div className="flex items-start justify-between gap-2">
                            <OriginBadge origin={lead.origin} />
                            <div className="flex items-center gap-1">
                                {lead.message_sent && (
                                    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20 gap-1 text-[10px] h-6">
                                        <CheckCircle2 className="w-3 h-3" />
                                        Enviada
                                    </Badge>
                                )}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-white bg-white/5"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setIsEditOpen(true)
                                    }}
                                    title="Editar Lead"
                                >
                                    <Pencil className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>

                        {/* Lead Info */}
                        <div>
                            <h4 className="font-medium text-sm text-white line-clamp-2 mb-1">
                                {lead.full_name}
                            </h4>
                            <div className="flex flex-wrap gap-1 mb-2">
                                {lead.labels?.map((label) => (
                                    <span
                                        key={label.id}
                                        className="inline-block w-2 h-2 rounded-full"
                                        style={{ backgroundColor: label.color || '#666' }}
                                        title={label.title}
                                    />
                                ))}
                            </div>
                            {lead.value !== undefined && (
                                <p className="text-sm font-semibold text-gray-400">
                                    R$ {(lead.value / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                            )}
                            {lead.price !== undefined && (
                                <p className="text-sm font-semibold text-gray-400">
                                    R$ {(lead.price / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                            )}
                            {lead.valor !== undefined && lead.valor !== null && (
                                <p className="text-sm font-semibold text-emerald-400">
                                    R$ {Number(lead.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="mt-auto pt-2 border-t border-white/5 flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 flex-1 text-xs text-muted-foreground hover:text-green-500 hover:bg-green-500/10"
                                onClick={handleWhatsAppClick}
                            >
                                <MessageSquare className="w-3 h-3 mr-1.5" />
                                WhatsApp
                            </Button>
                        </div>
                    </div>
                )}
            </Draggable>

            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Editar Lead</DialogTitle>
                        <DialogDescription>
                            Atualize as informações rápidas do lead.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="edit-name">Nome do Lead</Label>
                            <Input
                                id="edit-name"
                                value={editData.full_name}
                                onChange={(e) => setEditData({ ...editData, full_name: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-valor">Valor do Orçamento (R$)</Label>
                            <Input
                                id="edit-valor"
                                type="number"
                                step="0.01"
                                placeholder="Ex: 1500.00"
                                value={editData.valor}
                                onChange={(e) => setEditData({ ...editData, valor: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Etiquetas</Label>
                            {availableLabels.length === 0 ? (
                                <p className="text-xs text-muted-foreground">Nenhuma etiqueta cadastrada.</p>
                            ) : (
                                <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-black/20 border border-white/5 max-h-36 overflow-y-auto custom-scrollbar">
                                    {availableLabels.map((label) => {
                                        const isSelected = selectedLabelIds.includes(label.id)
                                        return (
                                            <button
                                                key={label.id}
                                                type="button"
                                                onClick={() => {
                                                    if (isSelected) {
                                                        setSelectedLabelIds(prev => prev.filter(id => id !== label.id))
                                                    } else {
                                                        setSelectedLabelIds(prev => [...prev, label.id])
                                                    }
                                                }}
                                                style={{ 
                                                    borderColor: label.color, 
                                                    backgroundColor: isSelected ? `${label.color}20` : 'transparent',
                                                    color: isSelected ? '#FFF' : label.color 
                                                }}
                                                className={`
                                                    px-2.5 py-1 text-xs font-bold rounded-md border transition-all hover:bg-white/5
                                                    ${isSelected ? "border-solid font-extrabold" : "border-dashed opacity-60"}
                                                `}
                                            >
                                                {label.title}
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                    <DialogFooter className="flex-row items-center gap-2 sm:justify-between">
                        <Button
                            variant="destructive"
                            onClick={handleDeleteLead}
                            disabled={isDeleting || isSaving}
                            className="mr-auto"
                        >
                            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                            Excluir
                        </Button>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={isSaving || isDeleting}>
                                Cancelar
                            </Button>
                            <Button onClick={handleSave} disabled={isSaving || isDeleting}>
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Salvar Alterações"}
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
