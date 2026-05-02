"use client"

import { useState, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Shield, ShieldAlert, MoreHorizontal, User, Check, X, ShieldCheck, Mail, Power, Edit, Trash2, Plus } from "lucide-react"

import { cn } from "@/lib/utils"
import { updateSubscriptionStatus, toggleAdminRole, updateProfileEmail, deleteAdminUser, createAdminUser } from "@/lib/actions/admin"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type Profile = {
  id: string
  full_name: string | null
  email: string | null
  subscription_status: string | null
  server_id: string | null
  is_admin: boolean | null
  updated_at: string | null
}

export function AdminClient({ initialProfiles }: { initialProfiles: Profile[] }) {
  const router = useRouter()
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles)
  const [isPending, startTransition] = useTransition()
  
  useEffect(() => {
    setProfiles(initialProfiles)
  }, [initialProfiles])

  // Email edit state
  const [editingUser, setEditingUser] = useState<Profile | null>(null)
  const [newEmail, setNewEmail] = useState("")

  // Create user state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newUser, setNewUser] = useState({ fullName: "", email: "", password: "", whatsapp: "", subscription_id: "" })

  const handleUpdateStatus = (userId: string, newStatus: string) => {
    startTransition(async () => {
      // Optimistic update
      setProfiles(prev => prev.map(p => p.id === userId ? { ...p, subscription_status: newStatus } : p))
      
      const { success, error } = await updateSubscriptionStatus(userId, newStatus)
      if (success) {
        toast.success(`Status atualizado para ${newStatus}`)
      } else {
        toast.error("Erro ao atualizar status: " + error)
        // Revert on error by refreshing the page or fetching data again.
        // For simplicity, we just show error.
      }
    })
  }

  const handleToggleAdmin = (userId: string, currentIsAdmin: boolean) => {
    const newStatus = !currentIsAdmin
    startTransition(async () => {
      // Optimistic update
      setProfiles(prev => prev.map(p => p.id === userId ? { ...p, is_admin: newStatus } : p))
      
      const { success, error } = await toggleAdminRole(userId, newStatus)
      if (success) {
        toast.success(newStatus ? "Privilégios de admin concedidos" : "Privilégios de admin removidos")
      } else {
        toast.error("Erro ao alterar privilégios: " + error)
      }
    })
  }

  const handleUpdateEmail = () => {
    if (!editingUser) return
    startTransition(async () => {
      setProfiles(prev => prev.map(p => p.id === editingUser.id ? { ...p, email: newEmail } : p))
      
      const { success, error } = await updateProfileEmail(editingUser.id, newEmail)
      if (success) {
        toast.success("Email atualizado com sucesso!")
        setEditingUser(null)
      } else {
        toast.error("Erro ao atualizar email: " + error)
      }
    })
  }

  const handleDeleteUser = (userId: string, userName: string) => {
    if (!window.confirm(`Tem certeza que deseja EXCLUIR permanentemente o usuário ${userName}? Esta ação não pode ser desfeita e removerá todos os dados atrelados a ele.`)) return

    startTransition(async () => {
      const { success, error } = await deleteAdminUser(userId)
      if (success) {
        toast.success("Usuário excluído com sucesso!")
        setProfiles(prev => prev.filter(p => p.id !== userId))
        router.refresh()
      } else {
        toast.error("Erro ao excluir usuário: " + error)
      }
    })
  }

  const handleCreateUser = () => {
    if (!newUser.email || !newUser.fullName) {
      toast.error("Nome e Email são obrigatórios")
      return
    }

    startTransition(async () => {
      const { success, error } = await createAdminUser(newUser)
      if (success) {
        toast.success("Usuário criado com sucesso!")
        setIsCreateDialogOpen(false)
        setNewUser({ fullName: "", email: "", password: "", whatsapp: "", subscription_id: "" })
        router.refresh()
      } else {
        toast.error("Erro ao criar usuário: " + error)
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button 
          className="bg-[#00A3FF] hover:bg-[#00A3FF]/80 text-white"
          onClick={() => setIsCreateDialogOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Novo Usuário
        </Button>
      </div>

      <div className="rounded-md border border-white/10 bg-[#0A0A12]/50 backdrop-blur-md">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-white/10 hover:bg-transparent">
            <TableHead className="text-xs font-black uppercase tracking-wider text-gray-400">Usuário</TableHead>
            <TableHead className="text-xs font-black uppercase tracking-wider text-gray-400">Server ID</TableHead>
            <TableHead className="text-xs font-black uppercase tracking-wider text-gray-400">Status Assinatura</TableHead>
            <TableHead className="text-xs font-black uppercase tracking-wider text-gray-400">Última Atualização</TableHead>
            <TableHead className="text-right text-xs font-black uppercase tracking-wider text-gray-400">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {profiles.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                Nenhum usuário encontrado.
              </TableCell>
            </TableRow>
          ) : (
            profiles.map((profile) => (
              <TableRow key={profile.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <TableCell className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#00A3FF]/10 border border-[#00A3FF]/20">
                      {profile.is_admin ? (
                        <ShieldAlert className="h-5 w-5 text-red-500" />
                      ) : (
                        <User className="h-5 w-5 text-[#00A3FF]" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-white">
                        {profile.full_name || "Usuário Sem Nome"}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">
                        {profile.email || `ID: ${profile.id.substring(0, 8)}...`}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {profile.server_id ? (
                    <Badge variant="outline" className="font-mono text-xs border-[#00A3FF]/30 text-[#00A3FF] bg-[#00A3FF]/5">
                      {profile.server_id}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-xs italic">N/A</span>
                  )}
                </TableCell>
                <TableCell>
                  {profile.subscription_status === 'active' ? (
                    <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                      Ativo
                    </Badge>
                  ) : profile.subscription_status === 'canceled' ? (
                    <Badge variant="outline" className="text-red-400 border-red-500/30">
                      Cancelado
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-yellow-500 border-yellow-500/30">
                      {profile.subscription_status || 'Inativo'}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm text-gray-400">
                  {profile.updated_at ? format(new Date(profile.updated_at), "dd 'de' MMM, yyyy", { locale: ptBR }) : 'Desconhecida'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end items-center gap-2">
                    {/* Botão direto para Bloquear/Desbloquear */}
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className={cn("h-8 w-8 hover:bg-white/10", profile.subscription_status === 'active' ? "text-emerald-500 hover:text-emerald-400" : "text-red-500 hover:text-red-400")}
                      title={profile.subscription_status === 'active' ? "Bloquear Acesso" : "Ativar Acesso"}
                      disabled={isPending}
                      onClick={() => handleUpdateStatus(profile.id, profile.subscription_status === 'active' ? 'canceled' : 'active')}
                    >
                      <Power className="h-4 w-4" />
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-white/10">
                        <span className="sr-only">Abrir menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-[#0A0A12] border-white/10">
                      <DropdownMenuLabel className="font-bold text-xs uppercase tracking-wider text-gray-400">Ações do Usuário</DropdownMenuLabel>
                      <DropdownMenuSeparator className="bg-white/10" />
                      
                      {/* Subscription Actions */}
                      {profile.subscription_status !== 'active' ? (
                        <DropdownMenuItem 
                          className="cursor-pointer text-emerald-400 focus:bg-emerald-500/10 focus:text-emerald-400"
                          onClick={() => handleUpdateStatus(profile.id, 'active')}
                          disabled={isPending}
                        >
                          <Check className="mr-2 h-4 w-4" />
                          Ativar Assinatura
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem 
                          className="cursor-pointer text-red-400 focus:bg-red-500/10 focus:text-red-400"
                          onClick={() => handleUpdateStatus(profile.id, 'canceled')}
                          disabled={isPending}
                        >
                          <X className="mr-2 h-4 w-4" />
                          Bloquear Acesso
                        </DropdownMenuItem>
                      )}

                      <DropdownMenuSeparator className="bg-white/10" />

                      {/* Admin Role Actions */}
                      <DropdownMenuItem 
                        className="cursor-pointer text-[#00A3FF] focus:bg-[#00A3FF]/10 focus:text-[#00A3FF]"
                        onClick={() => handleToggleAdmin(profile.id, !!profile.is_admin)}
                        disabled={isPending}
                      >
                        {profile.is_admin ? (
                          <>
                            <Shield className="mr-2 h-4 w-4" />
                            Remover Admin
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="mr-2 h-4 w-4" />
                            Tornar Admin
                          </>
                        )}
                      </DropdownMenuItem>

                      {/* Edit Email Action */}
                      <DropdownMenuItem 
                        className="cursor-pointer text-gray-300 focus:bg-white/10 focus:text-white"
                        onClick={() => {
                          setEditingUser(profile)
                          setNewEmail(profile.email || "")
                        }}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Editar Email
                      </DropdownMenuItem>

                      <DropdownMenuSeparator className="bg-white/10" />

                      {/* Delete User Action */}
                      <DropdownMenuItem 
                        className="cursor-pointer text-red-500 focus:bg-red-500/10 focus:text-red-500 font-medium"
                        onClick={() => handleDeleteUser(profile.id, profile.full_name || profile.email || 'Usuário')}
                        disabled={isPending}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir Usuário permanentemente
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Dialog open={!!editingUser} onOpenChange={(o) => !o && setEditingUser(null)}>
        <DialogContent className="bg-[#0A0A12] border border-white/10 text-white sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Email</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email" className="text-gray-400">
                Email de {editingUser?.full_name || 'Usuário'}
              </Label>
              <Input
                id="email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="bg-black/50 border-white/10 text-white"
                placeholder="exemplo@email.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingUser(null)} disabled={isPending}>Cancelar</Button>
            <Button 
              className="bg-[#00A3FF] hover:bg-[#00A3FF]/80 text-white" 
              onClick={handleUpdateEmail}
              disabled={isPending || !newEmail}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="bg-[#0A0A12] border border-white/10 text-white sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="fullName" className="text-gray-400">Nome Completo *</Label>
              <Input
                id="fullName"
                value={newUser.fullName}
                onChange={(e) => setNewUser({...newUser, fullName: e.target.value})}
                className="bg-black/50 border-white/10 text-white"
                placeholder="Ex: João Silva"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="newEmail" className="text-gray-400">Email *</Label>
              <Input
                id="newEmail"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                className="bg-black/50 border-white/10 text-white"
                placeholder="exemplo@email.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="whatsapp" className="text-gray-400">WhatsApp (Opcional)</Label>
              <Input
                id="whatsapp"
                value={newUser.whatsapp}
                onChange={(e) => setNewUser({...newUser, whatsapp: e.target.value})}
                className="bg-black/50 border-white/10 text-white"
                placeholder="Ex: 5511999999999"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="subscription_id" className="text-gray-400">ID da Assinatura (Opcional)</Label>
              <Input
                id="subscription_id"
                value={newUser.subscription_id}
                onChange={(e) => setNewUser({...newUser, subscription_id: e.target.value})}
                className="bg-black/50 border-white/10 text-white"
                placeholder="ID no Stripe, etc"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password" className="text-gray-400">Senha (Opcional)</Label>
              <Input
                id="password"
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                className="bg-black/50 border-white/10 text-white"
                placeholder="Deixe em branco para senha padrão"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Se deixado em branco, a senha padrão "Temporaria123!" será usada.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsCreateDialogOpen(false)} disabled={isPending}>Cancelar</Button>
            <Button 
              className="bg-[#00A3FF] hover:bg-[#00A3FF]/80 text-white" 
              onClick={handleCreateUser}
              disabled={isPending || !newUser.email || !newUser.fullName}
            >
              <Plus className="mr-2 h-4 w-4" />
              Criar Usuário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  )
}
