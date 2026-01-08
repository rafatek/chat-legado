"use client"

import { Draggable } from "@hello-pangea/dnd"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Lead } from "@/types/kanban"
import { MessageSquare, MapPin, Instagram, FileText, CheckCircle2 } from "lucide-react"

interface KanbanCardProps {
    lead: Lead
    index: number
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

export function KanbanCard({ lead, index }: KanbanCardProps) {
    const handleWhatsAppClick = (e: React.MouseEvent) => {
        e.stopPropagation() // Prevent dragging when clicking button
        if (lead.whatsapp) {
            const cleanNumber = lead.whatsapp.replace(/\D/g, '')
            window.open(`https://wa.me/${cleanNumber}`, '_blank')
        }
    }

    return (
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
                        {lead.message_sent && (
                            <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20 gap-1 text-[10px] h-6">
                                <CheckCircle2 className="w-3 h-3" />
                                Enviada
                            </Badge>
                        )}
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
                    </div>

                    {/* Actions */}
                    <div className="mt-auto pt-2 border-t border-white/5 flex items-center justify-between">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-full text-xs text-muted-foreground hover:text-green-500 hover:bg-green-500/10"
                            onClick={handleWhatsAppClick}
                        >
                            <MessageSquare className="w-3 h-3 mr-2" />
                            WhatsApp
                        </Button>
                    </div>
                </div>
            )}
        </Draggable>
    )
}
