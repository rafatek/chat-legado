"use client"

import { useState, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Shield, ShieldAlert, MoreHorizontal, User, Check, X, ShieldCheck, Mail, Power, Edit, Trash2, Plus, QrCode, RefreshCw, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { updateSubscriptionStatus, toggleAdminRole, updateProfileEmail, deleteAdminUser, createAdminUser } from "@/lib/actions/admin"
import { Smartphone } from "lucide-react"

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
  whatsapp_status?: string
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

  // WhatsApp Support Connection
  const [connectDialogUser, setConnectDialogUser] = useState<Profile | null>(null)
  const [connectInstance, setConnectInstance] = useState<{name: string, token: string} | null>(null)
  const [connectQr, setConnectQr] = useState<string | null>(null)
  const [connectPhone, setConnectPhone] = useState("")
  const [connectPairingCode, setConnectPairingCode] = useState<string | null>(null)
  const [connectLoading, setConnectLoading] = useState(false)
  const [connectStatus, setConnectStatus] = useState("disconnected")

  const UAZAPI_URL = process.env.NEXT_PUBLIC_UAZAPI_URL

  const handleOpenConnect = async (profile: Profile) => {
    setConnectDialogUser(profile)
    setConnectLoading(true)
    setConnectQr(null)
    setConnectPairingCode(null)
    setConnectPhone("")
    setConnectStatus("disconnected")

    // Fetch instance info safely
    const { getAdminWhatsappConnection, adminCreateWhatsappInstanceForUser } = await import("@/lib/actions/admin")
    let connData = null

    const { success, data } = await getAdminWhatsappConnection(profile.id)

    if (success && data && data.instance_name && data.instance_key) {
      connData = data
    } else {
      toast.info("Criando nova instância. Aguarde...")
      const createRes = await adminCreateWhatsappInstanceForUser(profile.id)
      if (createRes.success) {
         connData = { instance_name: createRes.instance_name, instance_key: createRes.instance_key, status: 'connecting' }
      } else {
         toast.error("Falha ao criar instância: " + createRes.error)
         setConnectDialogUser(null)
         setConnectLoading(false)
         return
      }
    }

    if (connData) {
      setConnectInstance({ name: connData.instance_name, token: connData.instance_key })
      setConnectStatus(connData.status || 'disconnected')
      
      // Fetch QR Code immediately
      try {
        const res = await fetch(`${UAZAPI_URL}/instance/connect`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "token": connData.instance_key },
          body: JSON.stringify({})
        })
        const qData = await res.json()
        const qrBase64 = qData?.instance?.qrcode || qData?.qrcode || qData?.base64 || qData?.instance?.base64
        if (qrBase64) setConnectQr(qrBase64)
      } catch(e) {
        toast.error("Erro ao puxar QR Code")
      }
    }
    setConnectLoading(false)
  }

  const handleGeneratePairingCode = async () => {
    if (!connectInstance || !connectPhone) return
    setConnectLoading(true)
    try {
      const cleanPhone = connectPhone.replace(/\D/g, '')
      // Removemos o ?number da URL, enviando estritamente como o seu cURL
      const res = await fetch(`${UAZAPI_URL}/instance/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "token": connectInstance.token },
        body: JSON.stringify({ 
           browser: "auto",
           systemName: "rafael turbo",
           proxy_managed_country: "br",
           proxy_managed_state: "sp",
           proxy_managed_city: "campinas",
           phone: cleanPhone 
        })
      })
      
      const rawText = await res.text()
      console.log("[Pairing Code Raw Response]:\n", rawText)

      let data: any = {}
      try {
        data = JSON.parse(rawText)
      } catch (err) {
        console.error("Não foi possível converter para JSON")
      }
      
      const code = data?.instance?.paircode || data?.paircode || data?.code || data?.pairingCode || data?.instance?.pairingCode || data?.data?.pairingCode
      if (code) {
        setConnectPairingCode(code)
      } else {
        toast.error(`Erro da API: ${data?.message || data?.error || 'Olhe o Console (F12)'}`)
      }
    } catch(e: any) {
      toast.error(`Erro ao chamar API: ${e.message}`)
    }
    setConnectLoading(false)
  }

  // Polling for Connect Dialog
  useEffect(() => {
    if (!connectDialogUser || !connectInstance || connectStatus === 'connected') return
    
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${UAZAPI_URL}/instance/status`, {
          headers: { "token": connectInstance.token }
        })
        const data = await res.json()
        const isConnectedApi = data?.connected === true || data?.state === "open" || data?.instance?.state === "open"
        
        if (isConnectedApi) {
          setConnectStatus("connected")
          toast.success(`WhatsApp conectado com sucesso para ${connectDialogUser.full_name || 'Usuário'}!`)
          
          setProfiles(prev => prev.map(p => p.id === connectDialogUser.id ? { ...p, whatsapp_status: 'connected' } : p))
          
          setTimeout(() => {
             setConnectDialogUser(null)
          }, 2000)
        }
      } catch(e) {}
    }, 4000)

    return () => clearInterval(interval)
  }, [connectDialogUser, connectInstance, connectStatus])

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

      <div className="rounded-md border border-border bg-card/50 backdrop-blur-md">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-white/10 hover:bg-transparent">
            <TableHead className="text-xs font-black uppercase tracking-wider text-gray-400">Usuário</TableHead>
            <TableHead className="text-xs font-black uppercase tracking-wider text-gray-400">Server ID</TableHead>
            <TableHead className="text-xs font-black uppercase tracking-wider text-gray-400">WhatsApp</TableHead>
            <TableHead className="text-xs font-black uppercase tracking-wider text-gray-400">Status Assinatura</TableHead>
            <TableHead className="text-xs font-black uppercase tracking-wider text-gray-400">Última Atualização</TableHead>
            <TableHead className="text-right text-xs font-black uppercase tracking-wider text-gray-400">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {profiles.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
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
                      <p className="font-semibold text-foreground">
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
                  {profile.whatsapp_status === 'connected' ? (
                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 gap-1.5 pl-1.5 pr-2">
                      <Smartphone className="h-3 w-3" /> Conectado
                    </Badge>
                  ) : profile.whatsapp_status === 'connecting' ? (
                    <Badge variant="outline" className="border-yellow-500/30 text-yellow-400 bg-yellow-500/10 gap-1.5 pl-1.5 pr-2">
                      <Smartphone className="h-3 w-3 animate-pulse" /> Conectando
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-gray-500/30 text-gray-400 bg-gray-500/10 gap-1.5 pl-1.5 pr-2">
                      <Smartphone className="h-3 w-3" /> Desconectado
                    </Badge>
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
                    <DropdownMenuContent align="end" className="bg-popover border-border">
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

                      {/* WhatsApp Connect Action */}
                      <DropdownMenuItem 
                        className="cursor-pointer text-purple-400 focus:bg-purple-500/10 focus:text-purple-400"
                        onClick={() => handleOpenConnect(profile)}
                      >
                        <Smartphone className="mr-2 h-4 w-4" />
                        Conectar WhatsApp (Suporte)
                      </DropdownMenuItem>

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

      {/* Connect WhatsApp Dialog */}
      <Dialog open={!!connectDialogUser} onOpenChange={(o) => !o && setConnectDialogUser(null)}>
        <DialogContent className="bg-[#0A0A12] border border-white/10 text-white sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Conexão Assistida</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center space-y-6 py-4">
            {connectLoading && !connectQr && !connectPairingCode ? (
              <div className="flex flex-col items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-[#00A3FF]" />
                <p className="mt-4 text-sm text-gray-400">Carregando dados da instância...</p>
              </div>
            ) : connectStatus === 'connected' ? (
              <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 animate-in fade-in zoom-in">
                <div className="h-16 w-16 bg-emerald-500/10 rounded-full flex items-center justify-center">
                  <Check className="h-8 w-8 text-emerald-500" />
                </div>
                <div>
                  <h3 className="text-emerald-500 font-bold text-lg">Conectado com Sucesso!</h3>
                  <p className="text-sm text-gray-400 mt-2">A instância do WhatsApp de <strong>{connectDialogUser?.full_name || 'Usuário'}</strong> já está operante e pronta para uso.</p>
                </div>
              </div>
            ) : (
              <>
                {/* QR Code Section */}
                <div className="w-full flex flex-col items-center justify-center bg-white/5 border border-white/10 rounded-xl p-4">
                  <h3 className="text-sm font-medium mb-4 flex items-center gap-2 text-gray-300">
                    <QrCode className="h-4 w-4 text-[#00A3FF]" />
                    Ler QR Code
                  </h3>
                  {connectQr ? (
                    <div className="bg-white p-2 rounded-lg">
                      <img src={connectQr} alt="QR Code" className="w-48 h-48 object-contain" />
                    </div>
                  ) : (
                    <div className="w-48 h-48 bg-black/40 flex items-center justify-center rounded-lg border border-white/10">
                      <QrCode className="h-12 w-12 text-gray-600" />
                    </div>
                  )}
                </div>

                <div className="w-full flex items-center justify-center">
                  <div className="h-px bg-white/10 w-full"></div>
                  <span className="px-4 text-xs font-medium text-gray-500 uppercase">Ou</span>
                  <div className="h-px bg-white/10 w-full"></div>
                </div>

                {/* Pairing Code Section */}
                <div className="w-full space-y-4 bg-white/5 border border-white/10 rounded-xl p-4">
                  <h3 className="text-sm font-medium flex items-center gap-2 text-gray-300">
                    <Smartphone className="h-4 w-4 text-[#00A3FF]" />
                    Conectar com Número
                  </h3>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ex: 5511999999999"
                      value={connectPhone}
                      onChange={(e) => setConnectPhone(e.target.value)}
                      className="bg-black/50 border-white/10 text-white"
                    />
                    <Button 
                      onClick={handleGeneratePairingCode}
                      disabled={connectLoading || !connectPhone}
                      className="bg-[#00A3FF] hover:bg-[#00A3FF]/80 text-white whitespace-nowrap"
                    >
                      {connectLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Gerar Código"}
                    </Button>
                  </div>
                  
                  {connectPairingCode && (
                    <div className="mt-4 p-4 bg-black/40 border border-white/10 rounded-lg text-center animate-in fade-in zoom-in">
                      <p className="text-xs text-gray-400 mb-2">Código de Emparelhamento:</p>
                      <p className="text-4xl font-mono font-bold text-emerald-400 tracking-widest">{connectPairingCode.slice(0,4)}-{connectPairingCode.slice(4)}</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  )
}
