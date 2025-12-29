"use client"

import { useState } from "react"
import { DragDropContext, DropResult, Droppable, Draggable } from "@hello-pangea/dnd"
import { KanbanColumn } from "./kanban-column"
import { Column } from "@/types/kanban"
import { Button } from "@/components/ui/button"
import { Plus, Loader2 } from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
interface KanbanBoardProps {
    initialColumns: Column[]
}

export function KanbanBoard({ initialColumns }: KanbanBoardProps) {
    const [columns, setColumns] = useState<Column[]>(initialColumns)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [newColumnTitle, setNewColumnTitle] = useState("")
    const [isCreating, setIsCreating] = useState(false)

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const onDragEnd = async (result: DropResult) => {
        const { destination, source, draggableId, type } = result

        if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) {
            return
        }

        // Handle Column Reordering
        if (type === 'column') {
            const newColumns = Array.from(columns)
            const [movedColumn] = newColumns.splice(source.index, 1)
            newColumns.splice(destination.index, 0, movedColumn)

            // Update positions locally
            const updatedColumns = newColumns.map((col, index) => ({
                ...col,
                position: index
            }))

            setColumns(updatedColumns)

            // Persist to Supabase
            try {
                // Get current user for RLS
                const { data: { session }, error: sessionError } = await supabase.auth.getSession()

                if (sessionError || !session?.user) {
                    throw new Error("Usuário não autenticado")
                }

                const userId = session.user.id

                const updates = updatedColumns.map((col, index) => ({
                    id: col.id,
                    user_id: userId,
                    title: col.title,
                    position: index
                }))

                const { error } = await supabase
                    .from('kanban_columns')
                    .upsert(updates, { onConflict: 'id' })

                if (error) throw error

            } catch (error: any) {
                console.error("Erro REAL do Supabase:", JSON.stringify(error, null, 2))
                toast.error(`Erro ao salvar ordem: ${error.message || "Verifique o console"}`)
                setColumns(initialColumns) // Revert
            }
            return
        }

        // Handle Lead Reordering (existing logic)
        const sourceColIndex = columns.findIndex(col => col.id === source.droppableId)
        const destColIndex = columns.findIndex(col => col.id === destination.droppableId)

        if (sourceColIndex === -1 || destColIndex === -1) return

        const newColumns = [...columns]
        const sourceCol = newColumns[sourceColIndex]
        const destCol = newColumns[destColIndex]

        if (source.droppableId === destination.droppableId) {
            const newLeads = Array.from(sourceCol.leads)
            const [movedLead] = newLeads.splice(source.index, 1)
            newLeads.splice(destination.index, 0, movedLead)

            newColumns[sourceColIndex] = { ...sourceCol, leads: newLeads }
            setColumns(newColumns)
            return
        }

        const sourceLeads = Array.from(sourceCol.leads)
        const destLeads = Array.from(destCol.leads)
        const [movedLead] = sourceLeads.splice(source.index, 1)

        const updatedLead = { ...movedLead, column_id: destination.droppableId }
        destLeads.splice(destination.index, 0, updatedLead)

        newColumns[sourceColIndex] = { ...sourceCol, leads: sourceLeads }
        newColumns[destColIndex] = { ...destCol, leads: destLeads }

        setColumns(newColumns)

        try {
            const { error } = await supabase
                .from('leads')
                .update({ column_id: destination.droppableId })
                .eq('id', draggableId)

            if (error) throw error
        } catch (error) {
            setColumns(initialColumns)
            toast.error("Erro ao mover lead")
            console.error("Error updating lead column:", error)
        }
    }

    const handleAddColumn = async () => {
        if (!newColumnTitle.trim()) return

        setIsCreating(true)
        const title = newColumnTitle
        const newPosition = columns.length > 0 ? Math.max(...columns.map(c => c.position)) + 1 : 0

        try {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession()

            if (sessionError || !session?.user) {
                console.error("Session error:", sessionError)
                toast.error("Sessão inválida. Por favor, faça login novamente.")
                setIsCreating(false)
                return
            }

            const userId = session.user.id

            console.log("Attempting insert column with:", { title, user_id: userId, position: newPosition })

            const { data, error } = await supabase
                .from('kanban_columns')
                .insert({
                    title: title,
                    position: newPosition,
                    user_id: userId
                })
                .select()
                .single()

            if (error) {
                console.error("Supabase insert error details:", error)
                throw error
            }

            if (data) {
                setColumns([...columns, {
                    id: data.id,
                    title: data.title,
                    position: data.position,
                    leads: []
                }])
                toast.success("Coluna criada com sucesso!")
                setIsDialogOpen(false)
                setNewColumnTitle("")
            }
        } catch (error: any) {
            console.error("Error creating column:", error)
            toast.error(`Erro ao criar coluna: ${error.message || "Erro desconhecido"}`)
        } finally {
            setIsCreating(false)
        }
    }

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex h-full gap-6 overflow-x-auto pb-4 items-start">
                <Droppable droppableId="board" type="column" direction="horizontal">
                    {(provided) => (
                        <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className="flex h-full gap-6 items-start"
                        >
                            {columns.map((col, index) => (
                                <Draggable key={col.id} draggableId={col.id} index={index}>
                                    {(provided) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                        >
                                            <KanbanColumn column={col} />
                                        </div>
                                    )}
                                </Draggable>
                            ))}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>

                <div className="min-w-[320px]">
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button
                                variant="outline"
                                className="w-full h-[50px] border-dashed border-white/10 bg-transparent hover:bg-white/5 text-muted-foreground hover:text-white"
                            >
                                <Plus className="mr-2 h-4 w-4" /> Adicionar Coluna
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Nova Coluna</DialogTitle>
                                <DialogDescription>
                                    Crie uma nova coluna para o seu pipeline de vendas.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="name" className="text-right">
                                        Nome
                                    </Label>
                                    <Input
                                        id="name"
                                        value={newColumnTitle}
                                        onChange={(e) => setNewColumnTitle(e.target.value)}
                                        placeholder="Ex: Em Negociação"
                                        className="col-span-3"
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit" onClick={handleAddColumn} disabled={isCreating}>
                                    {isCreating ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Criando...
                                        </>
                                    ) : (
                                        "Salvar Coluna"
                                    )}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
        </DragDropContext>
    )
}
