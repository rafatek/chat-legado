"use client"

import { useState } from "react"
import { DragDropContext, DropResult, Droppable, Draggable } from "@hello-pangea/dnd"
import { KanbanColumn } from "./kanban-column"
import { Column, Label as KanbanLabel } from "@/types/kanban"
import { Button } from "@/components/ui/button"
import { Plus, Loader2, UserPlus } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { LabelManager } from "./label-manager"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
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
    availableLabels?: KanbanLabel[]
}

const ORIGINS = [
    "WhatsApp",
    "Instagram",
    "Google Maps",
    "Extração CNPJ",
    "Outros"
]



export function KanbanBoard({ initialColumns, availableLabels = [] }: KanbanBoardProps) {
    const router = useRouter()
    
    // Board State
    const [columns, setColumns] = useState<Column[]>(initialColumns)
    const [isDeleting, setIsDeleting] = useState(false)
    const [columnToDelete, setColumnToDelete] = useState<Column | null>(null)

    // Add Column State
    const [isAddColumnOpen, setIsAddColumnOpen] = useState(false)
    const [newColumnTitle, setNewColumnTitle] = useState("")
    const [newColumnLabelId, setNewColumnLabelId] = useState<string>("none")
    const [isCreatingColumn, setIsCreatingColumn] = useState(false)

    // New Lead State
    const [isNewLeadOpen, setIsNewLeadOpen] = useState(false)
    const [isCreatingLead, setIsCreatingLead] = useState(false)
    const [newLeadData, setNewLeadData] = useState({
        full_name: "",
        whatsapp: "",
        origin: ""
    })



    // Supabase client imported from @/lib/supabase

    // --- Helpers ---

    const formatPhone = (value: string) => {
        const numbers = value.replace(/\D/g, "")
        if (numbers.length <= 11) {
            return numbers.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")
                .replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3")
        }
        return value
    }

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatPhone(e.target.value)
        setNewLeadData({ ...newLeadData, whatsapp: formatted })
    }

    // --- Handlers ---

    const onDragEnd = async (result: DropResult) => {
        console.log("DND Result:", result)
        const { destination, source, draggableId, type } = result

        if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) {
            return
        }

        // TRAVA DE SEGURANÇA (DND): Abortar se for COLUNA (index 0 protegido)
        if (type === 'column' && (source.index === 0 || destination.index === 0)) {
            return
        }

        // Handle Column Reordering
        if (type === 'column') {
            const newColumns = Array.from(columns)
            const [movedColumn] = newColumns.splice(source.index, 1)
            newColumns.splice(destination.index, 0, movedColumn)

            const updatedColumns = newColumns.map((col, index) => ({
                ...col,
                position: index
            }))

            setColumns(updatedColumns)

            try {
                const { data: { session }, error: sessionError } = await supabase.auth.getSession()

                if (sessionError || !session?.user) throw new Error("Usuário não autenticado")

                const updates = updatedColumns.map((col, index) => ({
                    id: col.id,
                    user_id: session.user.id,
                    title: col.title,
                    position: index
                }))

                const { error } = await supabase.from('kanban_columns').upsert(updates, { onConflict: 'id' })
                if (error) throw error

            } catch (error: any) {
                console.error("Erro Supabase:", error)
                toast.error("Erro ao salvar ordem das colunas")
                setColumns(columns)
            }
            return
        }

        // Handle Lead Reordering
        if (type === 'lead') {
            const sourceColIndex = columns.findIndex(col => col.id === source.droppableId)
            const destColIndex = columns.findIndex(col => col.id === destination.droppableId)

            if (sourceColIndex === -1 || destColIndex === -1) return

            const newColumns = [...columns]
            const sourceCol = newColumns[sourceColIndex]
            const destCol = newColumns[destColIndex]

            // Moving within same column
            if (source.droppableId === destination.droppableId) {
                const newLeads = Array.from(sourceCol.leads)
                const [movedLead] = newLeads.splice(source.index, 1)
                newLeads.splice(destination.index, 0, movedLead)

                newColumns[sourceColIndex] = { ...sourceCol, leads: newLeads }
                setColumns(newColumns)
                return
            }

            // Moving to different column
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
                setColumns(columns)
                toast.error("Erro ao mover lead")
                console.error("Move lead error:", error)
            }
        }

    }

    const handleAddColumn = async () => {
        if (!newColumnTitle.trim()) return

        setIsCreatingColumn(true)
        const title = newColumnTitle
        const newPosition = columns.length > 0 ? Math.max(...columns.map(c => c.position)) + 1 : 0

        try {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession()
            if (sessionError || !session?.user) throw new Error("Sessão inválida")

            const { data, error } = await supabase
                .from('kanban_columns')
                .insert({
                    title: title,
                    position: newPosition,
                    user_id: session.user.id,
                    linked_label_id: newColumnLabelId === "none" ? null : newColumnLabelId
                })
                .select()
                .single()

            if (error) throw error

            if (data) {
                setColumns([...columns, { ...data, leads: [] }])
                toast.success("Coluna criada!")
                setIsAddColumnOpen(false)
                setNewColumnTitle("")
                setNewColumnLabelId("none")
            }
        } catch (error: any) {
            console.error("Column create error:", error)
            toast.error("Erro ao criar coluna")
        } finally {
            setIsCreatingColumn(false)
        }
    }

    const handleRenameColumn = async (columnId: string, newTitle: string) => {
        try {
            const { error } = await supabase
                .from('kanban_columns')
                .update({ title: newTitle })
                .eq('id', columnId)

            if (error) throw error

            setColumns(prev => prev.map(c => c.id === columnId ? { ...c, title: newTitle } : c))
            toast.success("Coluna renomeada!")
        } catch (error) {
            console.error("Rename column error:", error)
            toast.error("Erro ao renomear coluna")
        }
    }

    const handleDeleteColumn = async () => {
        if (!columnToDelete) return

        setIsDeleting(true)
        const idx = columns.findIndex(c => c.id === columnToDelete.id)
        const previousColumn = columns[idx - 1]

        if (!previousColumn) {
            toast.error("Não é possível excluir esta coluna.")
            setIsDeleting(false)
            setColumnToDelete(null)
            return
        }

        try {
            const { error: updateError } = await supabase
                .from('leads')
                .update({ column_id: previousColumn.id })
                .eq('column_id', columnToDelete.id)

            if (updateError) throw updateError

            const { error: deleteError } = await supabase
                .from('kanban_columns')
                .delete()
                .eq('id', columnToDelete.id)

            if (deleteError) throw deleteError

            const newColumns = Array.from(columns)
            const prevColIndex = newColumns.findIndex(c => c.id === previousColumn.id)
            const colToDeleteIndex = newColumns.findIndex(c => c.id === columnToDelete.id)

            if (prevColIndex !== -1 && colToDeleteIndex !== -1) {
                const leadsToMove = newColumns[colToDeleteIndex].leads.map(lead => ({ ...lead, column_id: previousColumn.id }))
                newColumns[prevColIndex] = {
                    ...newColumns[prevColIndex],
                    leads: [...newColumns[prevColIndex].leads, ...leadsToMove]
                }
                newColumns.splice(colToDeleteIndex, 1)
                setColumns(newColumns)
            }

            toast.success("Coluna excluída e leads migrados.")
        } catch (error) {
            console.error("Delete error:", error)
            toast.error("Erro ao excluir coluna")
        } finally {
            setIsDeleting(false)
            setColumnToDelete(null)
        }
    }

    const handleCreateLead = async () => {
        if (!newLeadData.full_name || !newLeadData.whatsapp || !newLeadData.origin) {
            toast.warning("Preencha todos os campos obrigatórios")
            return
        }

        setIsCreatingLead(true)

        try {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession()
            if (sessionError || !session?.user) throw new Error("Sessão inválida")

            // Localização da Coluna: Position 0
            const targetColumn = columns.find(c => c.position === 0)

            if (!targetColumn) {
                toast.error("Coluna 'Novos Leads' não encontrada (position 0).")
                setIsCreatingLead(false)
                return
            }

            const payload = {
                user_id: session.user.id,
                column_id: targetColumn.id,
                full_name: newLeadData.full_name,
                whatsapp: newLeadData.whatsapp.replace(/\D/g, ""), // Store clean number
                origin: newLeadData.origin,
                message_sent: false
            }

            const { data, error } = await supabase
                .from('leads')
                .insert(payload)
                .select()
                .single()

            if (error) throw error

            if (data) {
                // Optimistic Update
                const newLead = {
                    id: data.id,
                    full_name: data.full_name,
                    whatsapp: data.whatsapp,
                    origin: data.origin, // This will be the mapped value from DB (e.g. 'instagram')
                    column_id: data.column_id,
                    message_sent: data.message_sent,
                    labels: []
                }

                const newColumns = columns.map(col => {
                    if (col.id === targetColumn.id) {
                        return { ...col, leads: [newLead, ...col.leads] }
                    }
                    return col
                })

                setColumns(newColumns)
                toast.success("Lead criado com sucesso!")
                setIsNewLeadOpen(false)
                setNewLeadData({ full_name: "", whatsapp: "", origin: "" })
            }

        } catch (error: any) {
            console.error("Erro ao Criar Lead:", error.message || error)
            toast.error("Erro ao criar lead. Verifique o console.")
        } finally {
            setIsCreatingLead(false)
        }
    }

    return (
        <div className="flex flex-col h-full gap-4">
            {/* Header / Toolbar */}
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                    {/* Placeholder */}
                </div>
                <div className="flex items-center gap-2">
                    <LabelManager 
                        availableLabels={availableLabels} 
                        onLabelsChange={() => router.refresh()} 
                    />

                    {/* Add Column Button */}
                    <Dialog open={isAddColumnOpen} onOpenChange={setIsAddColumnOpen}>
                        <DialogTrigger asChild>
                            <Button
                                variant="outline"
                                className="bg-[#111114] border-white/10 hover:bg-white/5 text-gray-300 hover:text-white"
                            >
                                <Plus className="mr-2 h-4 w-4" /> Nova Coluna
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Nova Coluna</DialogTitle>
                                <DialogDescription>Crie uma etapa para seu fluxo.</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="col-name" className="text-right">Nome</Label>
                                    <Input
                                        id="col-name"
                                        value={newColumnTitle}
                                        onChange={(e) => setNewColumnTitle(e.target.value)}
                                        className="col-span-3"
                                        placeholder="Ex: Em Negociação"
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4 mt-2">
                                    <Label htmlFor="col-tag" className="text-right text-xs text-muted-foreground leading-tight">Automação (Tag)</Label>
                                    <Select value={newColumnLabelId} onValueChange={setNewColumnLabelId}>
                                        <SelectTrigger className="col-span-3 h-9">
                                            <SelectValue placeholder="Nenhuma" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Nenhuma</SelectItem>
                                            {availableLabels?.map(label => (
                                                <SelectItem key={label.id} value={label.id}>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: label.color }} />
                                                        {label.title}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleAddColumn} disabled={isCreatingColumn}>
                                    {isCreatingColumn ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Criar Coluna"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* New Lead Button */}
                    <Dialog open={isNewLeadOpen} onOpenChange={setIsNewLeadOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                                <UserPlus className="mr-2 h-4 w-4" /> Novo Lead
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Novo Lead</DialogTitle>
                                <DialogDescription>Adicione um cliente potencial ao pipeline.</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="lead-name">Nome Completo</Label>
                                    <Input
                                        id="lead-name"
                                        value={newLeadData.full_name}
                                        onChange={(e) => setNewLeadData({ ...newLeadData, full_name: e.target.value })}
                                        placeholder="Ex: João da Silva"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="lead-whatsapp">WhatsApp</Label>
                                    <Input
                                        id="lead-whatsapp"
                                        value={newLeadData.whatsapp}
                                        onChange={handlePhoneChange}
                                        placeholder="(11) 99999-9999"
                                        maxLength={15}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="lead-origin">Origem</Label>
                                    <Select
                                        value={newLeadData.origin}
                                        onValueChange={(val) => setNewLeadData({ ...newLeadData, origin: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione a origem" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {ORIGINS.map((origin) => (
                                                <SelectItem key={origin} value={origin}>
                                                    {origin}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleCreateLead} disabled={isCreatingLead}>
                                    {isCreatingLead ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Adicionar Lead"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Board Area */}
            <DragDropContext onDragEnd={onDragEnd}>
                <div className="w-full h-full overflow-x-auto overflow-y-auto pb-6 custom-scrollbar select-none">
                    <Droppable droppableId="board" type="column" direction="horizontal">
                        {(provided) => (
                            <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className="inline-flex min-h-full gap-6 items-start px-4 min-w-max"
                            >
                                {columns.map((col, index) => (
                                    <Draggable key={col.id} draggableId={col.id} index={index}>
                                        {(provided) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                                className="flex-shrink-0"
                                            >
                                                <KanbanColumn
                                                    column={col}
                                                    availableLabels={availableLabels}
                                                    isDeletable={index !== 0}
                                                    onRename={handleRenameColumn}
                                                    onDelete={(id) => {
                                                        const c = columns.find(x => x.id === id)
                                                        if (c) setColumnToDelete(c)
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </div>
            </DragDropContext>

            {/* Delete Confirmation */}
            <AlertDialog open={!!columnToDelete} onOpenChange={(open) => !open && !isDeleting && setColumnToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Coluna</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja excluir esta coluna?
                            <br /><br />
                            Todos os leads serão movidos automaticamente para a coluna anterior:
                            {columnToDelete && columns.findIndex(c => c.id === columnToDelete.id) > 0 && (
                                <span className="font-bold text-white ml-1">
                                    {columns[columns.findIndex(c => c.id === columnToDelete.id) - 1]?.title}
                                </span>
                            )}
                            .
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault()
                                handleDeleteColumn()
                            }}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                        >
                            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar Exclusão"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
