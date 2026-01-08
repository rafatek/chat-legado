import { Droppable } from "@hello-pangea/dnd"
import { KanbanCard } from "./kanban-card"
import { Column } from "@/types/kanban"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"

interface KanbanColumnProps {
    column: Column
    onDelete?: (columnId: string) => void
}

export function KanbanColumn({ column, onDelete }: KanbanColumnProps) {
    const isProtected = ["Novos Leads", "Fechados"].includes(column.title)

    return (
        <div className="flex flex-col w-[350px] min-w-[350px] flex-shrink-0 h-full max-h-full">
            {/* Column Header */}
            <div className="flex items-center justify-between p-4 mb-3 rounded-lg bg-[#111114] border border-white/5">
                <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm text-gray-200">{column.title}</h3>
                    <Badge variant="secondary" className="text-xs bg-white/5 hover:bg-white/10 text-gray-400">
                        {column.leads.length}
                    </Badge>
                </div>

                {!isProtected && onDelete && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-500 hover:text-red-400 hover:bg-white/5"
                        onClick={() => onDelete(column.id)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                )}
            </div>

            {/* Droppable Area */}
            <Droppable droppableId={column.id} type="lead">
                {(provided, snapshot) => (
                    <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className={`
                flex-1 flex flex-col gap-3 p-2 rounded-lg transition-colors overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent
                ${snapshot.isDraggingOver ? "bg-white/[0.02]" : "bg-transparent"}
            `}
                        style={{ minHeight: '150px', flexGrow: 1, maxHeight: 'calc(100vh - 200px)' }}
                    >
                        {column.leads.map((lead, index) => (
                            <KanbanCard key={lead.id} lead={lead} index={index} />
                        ))}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </div>
    )
}
