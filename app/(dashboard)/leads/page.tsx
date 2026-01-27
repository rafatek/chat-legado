"use client"

import { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Search,
  UserPlus,
  Folder as FolderIcon,
  FolderOpen,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// Types
interface Lead {
  id: string
  user_id: string
  column_id: string | null
  full_name: string
  whatsapp: string | null
  company_name: string | null
  origin: string | null
  folder: string | null
  created_at: string
}

interface KanbanColumn {
  id: string
  title: string
  position: number
}

interface Folder {
  id: string
  user_id: string
  name: string
}

interface FolderStats {
  id?: string
  name: string
  count: number
  isPersistent: boolean
}

// Masking Helper
const formatPhone = (value: string) => {
  return value
    .replace(/\D/g, "")
    .replace(/^(\d{2})(\d)/g, "($1) $2")
    .replace(/(\d)(\d{4})$/, "$1-$2")
}

export default function LeadsPage() {
  // Data State
  const [leads, setLeads] = useState<Lead[]>([])
  const [columns, setColumns] = useState<KanbanColumn[]>([])
  const [dbFolders, setDbFolders] = useState<Folder[]>([])
  const [folderCounts, setFolderCounts] = useState<Record<string, number>>({})

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalLeads, setTotalLeads] = useState(0)

  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [selectedFolder, setSelectedFolder] = useState<string | null>("Todas")
  const [searchQuery, setSearchQuery] = useState("")

  // Form State
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [newLeadName, setNewLeadName] = useState("")
  const [newLeadPhone, setNewLeadPhone] = useState("")
  const [newLeadCompany, setNewLeadCompany] = useState("")
  const [newLeadFolder, setNewLeadFolder] = useState("")
  const [newLeadOrigin, setNewLeadOrigin] = useState("Outros")
  const [submitting, setSubmitting] = useState(false)

  // Folder Management State
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [isRenameOpen, setIsRenameOpen] = useState(false)
  const [renameFolderName, setRenameFolderName] = useState("")
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  // Debounce for search
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setCurrentPage(1)
      fetchLeads()
    }, 500)

    return () => clearTimeout(delayDebounceFn)
  }, [searchQuery, selectedFolder, pageSize])

  useEffect(() => {
    fetchLeads()
  }, [currentPage])

  useEffect(() => {
    fetchStaticData()
    fetchFolderCounts()
  }, [])

  const fetchStaticData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [colsRes, foldersRes] = await Promise.all([
        supabase.from('kanban_columns').select('*').eq('user_id', user.id).order('position'),
        supabase.from('folders').select('*').eq('user_id', user.id).order('name')
      ])

      if (colsRes.error) throw colsRes.error
      if (foldersRes.error) throw foldersRes.error

      setColumns(colsRes.data || [])
      setDbFolders(foldersRes.data || [])
    } catch (error) {
      console.error(error)
      toast.error('Erro ao carregar dados iniciais.')
    }
  }

  const fetchFolderCounts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('leads')
        .select('folder')
        .eq('user_id', user.id)

      if (error) throw error

      const counts: Record<string, number> = {}
      data?.forEach(l => {
        const f = l.folder || "Sem pasta"
        counts[f] = (counts[f] || 0) + 1
      })
      counts['Todas'] = data?.length || 0
      setFolderCounts(counts)
    } catch (error) {
      console.error('Error counting folders:', error)
    }
  }

  const fetchLeads = async () => {
    if (searching) return
    try {
      setSearching(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let query = supabase
        .from('leads')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)

      if (selectedFolder && selectedFolder !== "Todas") {
        if (selectedFolder === "Sem pasta") {
          query = query.eq('folder', 'Sem pasta')
        } else {
          query = query.eq('folder', selectedFolder)
        }
      }

      if (searchQuery) {
        query = query.or(`full_name.ilike.%${searchQuery}%,whatsapp.ilike.%${searchQuery}%,company_name.ilike.%${searchQuery}%`)
      }

      const from = (currentPage - 1) * pageSize
      const to = from + pageSize - 1

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) throw error

      setLeads(data || [])
      setTotalLeads(count || 0)

    } catch (error) {
      console.error('Error fetching leads:', error)
      toast.error('Erro ao carregar leads.')
    } finally {
      setSearching(false)
      setLoading(false)
    }
  }

  // Derived State: Folders View
  const foldersView: FolderStats[] = useMemo(() => {
    const stats: FolderStats[] = dbFolders.map(f => ({
      id: f.id,
      name: f.name,
      count: folderCounts[f.name] || 0,
      isPersistent: true
    }))

    Object.keys(folderCounts).forEach(fName => {
      if (fName !== "Todas" && fName !== "Sem pasta" && !stats.some(s => s.name === fName)) {
        stats.push({
          name: fName,
          count: folderCounts[fName],
          isPersistent: false
        })
      }
    })

    stats.sort((a, b) => a.name.localeCompare(b.name))

    return [
      { name: "Todas", count: folderCounts['Todas'] || 0, isPersistent: false },
      ...stats,
      { name: "Sem pasta", count: folderCounts['Sem pasta'] || 0, isPersistent: false }
    ]
  }, [dbFolders, folderCounts])

  // Actions
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    if (dbFolders.some(f => f.name.toLowerCase() === newFolderName.toLowerCase())) {
      toast.error("Pasta já existe")
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('folders')
        .insert({ user_id: user.id, name: newFolderName.trim() })
        .select()
        .single()

      if (error) throw error

      setDbFolders([...dbFolders, data])
      setIsNewFolderOpen(false)
      setNewFolderName("")
      toast.success(`Pasta "${newFolderName}" criada!`)

    } catch (error) {
      console.error(error)
      toast.error("Erro ao criar pasta")
    }
  }

  const handleRenameFolder = async () => {
    if (!selectedFolder || selectedFolder === "Todas" || selectedFolder === "Sem pasta") return
    if (!renameFolderName.trim()) return
    const folderObj = dbFolders.find(f => f.name === selectedFolder)
    if (!folderObj) {
      toast.error("Não é possível renomear esta pasta.")
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error: folderError } = await supabase
        .from('folders')
        .update({ name: renameFolderName })
        .eq('id', folderObj.id)

      if (folderError) throw folderError

      await supabase
        .from('leads')
        .update({ folder: renameFolderName })
        .eq('folder', selectedFolder)
        .eq('user_id', user.id)

      setDbFolders(dbFolders.map(f => f.id === folderObj.id ? { ...f, name: renameFolderName } : f))
      setSelectedFolder(renameFolderName)
      fetchFolderCounts()
      fetchLeads()
      setIsRenameOpen(false)
      toast.success("Pasta renomeada!")
    } catch (error) {
      console.error(error)
      toast.error("Erro ao renomear pasta")
    }
  }

  const handleDeleteFolder = async () => {
    if (!selectedFolder || selectedFolder === "Todas" || selectedFolder === "Sem pasta") return
    const folderObj = dbFolders.find(f => f.name === selectedFolder)
    if (!folderObj) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase
        .from('leads')
        .update({ folder: "Sem pasta" })
        .eq('folder', selectedFolder)
        .eq('user_id', user.id)

      await supabase
        .from('folders')
        .delete()
        .eq('id', folderObj.id)

      setDbFolders(dbFolders.filter(f => f.id !== folderObj.id))
      setSelectedFolder("Todas")
      fetchFolderCounts()
      fetchLeads()
      setIsDeleteOpen(false)
      toast.success("Pasta excluída.")
    } catch (error) {
      console.error(error)
      toast.error("Erro ao excluir pasta")
    }
  }

  const handleMoveLead = async (leadId: string, newFolder: string) => {
    try {
      await supabase
        .from('leads')
        .update({ folder: newFolder })
        .eq('id', leadId)

      setLeads(leads.map(l => l.id === leadId ? { ...l, folder: newFolder } : l))
      fetchFolderCounts()
      toast.success(`Lead movido para ${newFolder}`)
    } catch (error) {
      console.error(error)
      toast.error("Erro ao mover lead")
    }
  }

  const handleAddLead = async () => {
    if (!newLeadName || !newLeadPhone) {
      toast.error("Nome e Telefone são obrigatórios")
      return
    }

    try {
      setSubmitting(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Usuário não autenticado")

      const defaultColumnId = columns.length > 0 ? columns[0].id : null

      const { data, error } = await supabase.from('leads').insert({
        user_id: user.id,
        full_name: newLeadName,
        whatsapp: newLeadPhone.replace(/\D/g, ""),
        company_name: newLeadCompany,
        folder: newLeadFolder || "Sem pasta",
        origin: newLeadOrigin,
        column_id: defaultColumnId,
      }).select().single()

      if (error) throw error

      toast.success("Lead adicionado!")
      fetchFolderCounts()
      fetchLeads()
      setIsAddOpen(false)

      setNewLeadName("")
      setNewLeadPhone("")
      setNewLeadCompany("")
      setNewLeadFolder("")
      setNewLeadOrigin("Outros")

    } catch (error) {
      console.error(error)
      toast.error("Erro ao salvar lead.")
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusName = (columnId: string | null) => {
    if (!columnId) return "Sem Status"
    const col = columns.find(c => c.id === columnId)
    return col ? col.title : "Desconhecido"
  }

  const totalPages = Math.ceil(totalLeads / pageSize)

  // Pagination Helper: Limited page numbers
  const getPageNumbers = () => {
    const pages = []
    const zoom = 2 // How many pages to show around current
    // Always show 1
    if (currentPage > zoom + 1) pages.push(1)
    if (currentPage > zoom + 2) pages.push('...')

    for (let i = Math.max(1, currentPage - zoom); i <= Math.min(totalPages, currentPage + zoom); i++) {
      pages.push(i)
    }

    if (currentPage < totalPages - zoom - 1) pages.push('...')
    if (currentPage < totalPages - zoom) pages.push(totalPages)

    return pages
  }

  return (
    // Changed: Removed h-[calc] and overflow constraints for natural document scroll
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Leads
          </h1>
          <p className="mt-1 text-muted-foreground">Gerencie e organize seus leads por pastas</p>
        </div>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Adicionar Lead
            </Button>
          </DialogTrigger>
          <DialogContent>
            {/* ... (Keep existing Dialog Content) ... */}
            <DialogHeader>
              <DialogTitle>Novo Lead</DialogTitle>
              <DialogDescription>
                Adicione um novo lead manualmente ao sistema.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input
                    placeholder="Nome do cliente"
                    value={newLeadName}
                    onChange={(e) => setNewLeadName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Empresa</Label>
                  <Input
                    placeholder="Nome da empresa"
                    value={newLeadCompany}
                    onChange={(e) => setNewLeadCompany(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Telefone *</Label>
                  <Input
                    placeholder="(00) 00000-0000"
                    value={newLeadPhone}
                    onChange={(e) => setNewLeadPhone(formatPhone(e.target.value))}
                    maxLength={15}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Origem</Label>
                  <Select value={newLeadOrigin} onValueChange={setNewLeadOrigin}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Instagram">Instagram</SelectItem>
                      <SelectItem value="Google Maps">Google Maps</SelectItem>
                      <SelectItem value="Extração CNPJ">Extração CNPJ</SelectItem>
                      <SelectItem value="Outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Pasta</Label>
                <Select value={newLeadFolder} onValueChange={setNewLeadFolder}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione ou deixe vazio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sem pasta">Sem pasta</SelectItem>
                    {dbFolders.map(f => (
                      <SelectItem key={f.name} value={f.name}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancelar</Button>
              <Button onClick={handleAddLead} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Lead
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Dialog open={isNewFolderOpen} onOpenChange={setIsNewFolderOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <Plus className="mr-2 h-4 w-4" /> Nova pasta
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Nova Pasta</DialogTitle>
            </DialogHeader>
            <Input
              placeholder="Nome da pasta"
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsNewFolderOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateFolder}>Criar Pasta</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {selectedFolder !== "Todas" && selectedFolder !== "Sem pasta" && dbFolders.some(f => f.name === selectedFolder) && (
          <>
            <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary" onClick={() => setRenameFolderName(selectedFolder || "")}>
                  <Pencil className="mr-2 h-4 w-4" /> Renomear
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Renomear Pasta</DialogTitle>
                </DialogHeader>
                <Input
                  value={renameFolderName}
                  onChange={e => setRenameFolderName(e.target.value)}
                />
                <DialogFooter>
                  <Button onClick={handleRenameFolder}>Salvar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" onClick={() => setIsDeleteOpen(true)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Excluir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                  <AlertDialogDescription>
                    A pasta "{selectedFolder}" será excluída.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteFolder} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Confirmar Exclusão
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}


      </div>

      {/* Folders Cards */}
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-800">
        {foldersView.map((folder) => (
          <div
            key={folder.name}
            onClick={() => setSelectedFolder(folder.name)}
            className={cn(
              "min-w-[160px] cursor-pointer rounded-xl border p-4 transition-all hover:bg-accent/50",
              selectedFolder === folder.name
                ? "bg-primary/10 border-primary"
                : "bg-card border-border"
            )}
          >
            <div className="flex items-start justify-between">
              {selectedFolder === folder.name ? (
                <FolderOpen className="h-6 w-6 text-primary" />
              ) : (
                <FolderIcon className="h-6 w-6 text-muted-foreground" />
              )}
              <span className="text-xs font-medium text-muted-foreground">
                {folder.count} leads
              </span>
            </div>
            <h3 className={cn(
              "mt-3 font-semibold text-sm truncate",
              selectedFolder === folder.name ? "text-primary" : "text-foreground"
            )}>
              {folder.name}
            </h3>
          </div>
        ))}
      </div>

      {/* Main Content Area - Natural Height */}
      <Card className="min-h-[400px]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Lista de Leads</CardTitle>
              <CardDescription>
                Vendo leads da pasta: <span className="font-semibold text-primary">{selectedFolder}</span>
              </CardDescription>
            </div>
          </div>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, telefone ou empresa..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>
        </CardHeader>

        {/* Content */}
        <CardContent>
          {loading && !searching ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : leads.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Nenhum lead encontrado.
            </div>
          ) : (
            <div className="space-y-3">
              {leads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent/50 group"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-base">{lead.full_name}</h3>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <span>{lead.company_name || "Sem empresa"}</span>
                        <span className="hidden sm:inline">•</span>
                        <span>{lead.whatsapp || "Sem telefone"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                    <Badge variant="secondary" className="bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 whitespace-nowrap">
                      {lead.origin || "N/A"}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn(
                        "bg-green-500/10 text-green-500 border-green-500/20 whitespace-nowrap",
                        getStatusName(lead.column_id) === "Sem Status" && "bg-gray-500/10 text-gray-500 border-gray-500/20"
                      )}
                    >
                      {getStatusName(lead.column_id)}
                    </Badge>

                    {/* FOLDER SELECTOR IN ROW */}
                    <div className="min-w-[140px]">
                      <Select
                        value={lead.folder || "Sem pasta"}
                        onValueChange={(val) => handleMoveLead(lead.id, val)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Sem pasta">Sem pasta</SelectItem>
                          {dbFolders.map(f => (
                            <SelectItem key={f.name} value={f.name}>{f.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>

        {/* 3-Column Footer */}
        <div className="border-t p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* LEFT: Page Size */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Itens por página:</span>
            <Select value={String(pageSize)} onValueChange={(val) => { setPageSize(Number(val)); setCurrentPage(1); }}>
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* CENTER: Info Text */}
          <div className="text-sm text-muted-foreground text-center">
            Exibindo {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, totalLeads)} de {totalLeads} leads
          </div>

          {/* RIGHT: Numeric Pagination */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {getPageNumbers().map((p, i) => (
              p === '...' ? (
                <span key={i} className="px-2 text-sm text-muted-foreground">...</span>
              ) : (
                <Button
                  key={i}
                  variant={currentPage === p ? "default" : "outline"}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setCurrentPage(Number(p))}
                >
                  {p}
                </Button>
              )
            ))}

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
