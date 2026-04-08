"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import {
  Send, MessageSquare, Search, Loader2, CheckCheck, Check,
  ArrowLeft, Phone, Circle, Plus, X, UserPlus
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

// =============================================
// Types
// =============================================
interface Conversation {
  id: string
  contact_phone: string
  contact_name: string
  last_message: string
  last_message_at: string
  unread_count: number
  is_open: boolean
}

interface Message {
  id: string
  conversation_id: string
  content: string
  from_me: boolean
  status: string
  created_at: string
  whatsapp_message_id?: string
}

// =============================================
// Helpers
// =============================================
function formatTime(iso: string) {
  const date = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  if (diffDays === 1) return "Ontem"
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
}

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()
}

const AVATAR_COLORS = [
  "bg-violet-500", "bg-blue-500", "bg-emerald-500", "bg-orange-500",
  "bg-pink-500", "bg-teal-500", "bg-red-500", "bg-indigo-500",
]

function getAvatarColor(phone: string) {
  const sum = phone.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return AVATAR_COLORS[sum % AVATAR_COLORS.length]
}

function ContactAvatar({ name, phone, size = "md" }: { name: string; phone: string; size?: "sm" | "md" | "lg" }) {
  const sizeClass = { sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-12 w-12 text-base" }[size]
  return (
    <div className={cn("rounded-full flex items-center justify-center font-bold text-white flex-shrink-0", sizeClass, getAvatarColor(phone))}>
      {getInitials(name || phone)}
    </div>
  )
}

function MessageBubble({ message }: { message: Message }) {
  const isMe = message.from_me
  return (
    <div className={cn("flex gap-2 max-w-[75%]", isMe ? "ml-auto flex-row-reverse" : "mr-auto")}>
      <div className={cn(
        "rounded-2xl px-4 py-2.5 text-sm shadow-sm",
        isMe ? "bg-[#00A3FF] text-white rounded-tr-sm" : "bg-[#1A1A23] text-gray-100 border border-white/5 rounded-tl-sm"
      )}>
        <p className="leading-relaxed break-words">{message.content}</p>
        <div className={cn("flex items-center gap-1 mt-1", isMe ? "justify-end" : "justify-start")}>
          <span className={cn("text-[10px]", isMe ? "text-blue-100/70" : "text-gray-500")}>
            {formatTime(message.created_at)}
          </span>
          {isMe && (message.status === "read"
            ? <CheckCheck className="h-3 w-3 text-blue-200" />
            : <Check className="h-3 w-3 text-blue-200/60" />
          )}
        </div>
      </div>
    </div>
  )
}

// =============================================
// Main Component
// =============================================
export default function AtendimentoPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [filteredConvs, setFilteredConvs] = useState<Conversation[]>([])
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [isLoadingConvs, setIsLoadingConvs] = useState(true)
  const [isLoadingMsgs, setIsLoadingMsgs] = useState(false)
  const [search, setSearch] = useState("")
  const [isMobileView, setIsMobileView] = useState(false)

  // Nova Conversa Dialog
  const [isNewConvOpen, setIsNewConvOpen] = useState(false)
  const [newConvPhone, setNewConvPhone] = useState("")
  const [newConvName, setNewConvName] = useState("")
  const [newConvMsg, setNewConvMsg] = useState("")
  const [isCreatingConv, setIsCreatingConv] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const searchParams = useSearchParams()

  // ---- Load User ----
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }: { data: { user: { id: string } | null } }) => {
      if (user) setUserId(user.id)
    })
  }, [])

  // ---- Auto-open from CRM (?phone=...&name=...) ----
  useEffect(() => {
    const phone = searchParams.get('phone')
    const name = searchParams.get('name')
    if (phone) {
      setNewConvPhone(phone)
      setNewConvName(name || '')
      setIsNewConvOpen(true)
    }
  }, [searchParams])

  // ---- Load Conversations ----
  const loadConversations = useCallback(async () => {
    if (!userId) return
    setIsLoadingConvs(true)
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("user_id", userId)
      .order("last_message_at", { ascending: false })
    if (!error && data) {
      setConversations(data)
      setFilteredConvs(data)
    }
    setIsLoadingConvs(false)
  }, [userId])

  useEffect(() => { loadConversations() }, [loadConversations])

  // ---- Search Filter ----
  useEffect(() => {
    const q = search.toLowerCase()
    if (!q) { setFilteredConvs(conversations); return }
    setFilteredConvs(conversations.filter(c =>
      c.contact_name?.toLowerCase().includes(q) ||
      c.contact_phone.includes(q) ||
      c.last_message?.toLowerCase().includes(q)
    ))
  }, [search, conversations])

  // ---- Realtime: Conversations ----
  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel("convs-realtime")
      .on("postgres_changes",
        { event: "*", schema: "public", table: "conversations", filter: `user_id=eq.${userId}` },
        (payload: { eventType: string; new: Conversation }) => {
          if (payload.eventType === "INSERT") {
            setConversations(prev => [payload.new as Conversation, ...prev])
          } else if (payload.eventType === "UPDATE") {
            setConversations(prev =>
              prev.map(c => c.id === payload.new.id ? payload.new as Conversation : c)
                .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime())
            )
            setSelectedConv(prev => prev?.id === payload.new.id ? payload.new as Conversation : prev)
          }
        })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId])

  // ---- Load Messages ----
  const loadMessages = useCallback(async (convId: string) => {
    setIsLoadingMsgs(true)
    const { data, error } = await supabase
      .from("messages").select("*").eq("conversation_id", convId).order("created_at", { ascending: true })
    if (!error && data) setMessages(data)
    setIsLoadingMsgs(false)
    if (userId) {
      await supabase.from("conversations").update({ unread_count: 0 }).eq("id", convId).eq("user_id", userId)
    }
  }, [userId])

  // ---- Realtime: Messages ----
  useEffect(() => {
    if (!selectedConv) return
    loadMessages(selectedConv.id)
    const channel = supabase
      .channel(`msgs-${selectedConv.id}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${selectedConv.id}` },
        (payload: { new: Message }) => {
          setMessages(prev => prev.find(m => m.id === payload.new.id) ? prev : [...prev, payload.new as Message])
        })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [selectedConv?.id, loadMessages])

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages])
  useEffect(() => { if (selectedConv) setTimeout(() => inputRef.current?.focus(), 100) }, [selectedConv])

  // ---- Send Message ----
  const handleSend = async () => {
    if (!newMessage.trim() || !selectedConv || isSending) return
    const content = newMessage.trim()
    setNewMessage("")
    setIsSending(true)

    const tempMsg: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: selectedConv.id,
      content,
      from_me: true,
      status: "sending",
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, tempMsg])

    try {
      // Pega o token JWT da sessão atual para autenticar a rota do servidor
      const { data: { session } } = await supabase.auth.getSession()

      const res = await fetch("/api/inbox/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({ conversation_id: selectedConv.id, contact_phone: selectedConv.contact_phone, content }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Erro ao enviar mensagem")
        setMessages(prev => prev.filter(m => m.id !== tempMsg.id))
        setNewMessage(content)
        return
      }
      setMessages(prev => prev.map(m => m.id === tempMsg.id ? data.message : m))
    } catch {
      toast.error("Erro de conexão ao enviar mensagem")
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id))
      setNewMessage(content)
    } finally {
      setIsSending(false)
    }
  }


  // ---- Nova Conversa ----
  const handleCreateConversation = async () => {
    const phone = newConvPhone.replace(/\D/g, "")
    const firstMsg = newConvMsg.trim()

    if (!phone || phone.length < 10) {
      toast.warning("Digite um número de WhatsApp válido")
      return
    }
    if (!firstMsg) {
      toast.warning("Digite uma mensagem para enviar")
      return
    }

    setIsCreatingConv(true)
    try {
      // 1. Upsert conversation no Supabase
      const { data: conv, error: convErr } = await supabase
        .from("conversations")
        .upsert({
          user_id: userId,
          contact_phone: phone,
          contact_name: newConvName.trim() || phone,
          last_message: firstMsg,
          last_message_at: new Date().toISOString(),
          unread_count: 0,
          is_open: true,
        }, { onConflict: "user_id,contact_phone" })
        .select()
        .single()

      if (convErr || !conv) {
        toast.error("Erro ao criar conversa")
        return
      }

      // 2. Envia a primeira mensagem via UazAPI
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch("/api/inbox/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({ conversation_id: conv.id, contact_phone: phone, content: firstMsg }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || "Conversa criada, mas falha ao enviar a mensagem")
      } else {
        toast.success("Conversa iniciada e mensagem enviada!")
      }

      // 3. Abre a conversa
      setSelectedConv(conv)
      setMessages([])
      setIsMobileView(true)
      setIsNewConvOpen(false)
      setNewConvPhone("")
      setNewConvName("")
      setNewConvMsg("")

      // Atualiza lista
      loadConversations()
    } catch (err) {
      toast.error("Erro inesperado ao criar conversa")
    } finally {
      setIsCreatingConv(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handleSelectConv = (conv: Conversation) => {
    setSelectedConv(conv)
    setMessages([])
    setIsMobileView(true)
  }

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0)

  return (
    <>
      <div className="flex h-full rounded-xl overflow-hidden border border-white/5 bg-[#0A0A0E]">

        {/* ===== SIDEBAR ===== */}
        <div className={cn(
          "flex flex-col border-r border-white/5 bg-[#0D0D12] transition-all duration-300",
          "w-full md:w-[340px] md:flex-shrink-0",
          isMobileView && selectedConv ? "hidden md:flex" : "flex"
        )}>
          {/* Header */}
          <div className="p-4 border-b border-white/5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white">Atendimento</h1>
                {totalUnread > 0 && (
                  <Badge className="bg-[#00A3FF] text-white text-[10px] h-5 min-w-5 flex items-center justify-center px-1.5">
                    {totalUnread}
                  </Badge>
                )}
              </div>
              {/* Botão Nova Conversa */}
              <Button
                size="icon"
                onClick={() => setIsNewConvOpen(true)}
                className="h-8 w-8 rounded-lg bg-[#00A3FF]/10 hover:bg-[#00A3FF]/20 border border-[#00A3FF]/20 text-[#00A3FF]"
                title="Nova Conversa"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar conversa..."
                className="pl-9 h-9 bg-white/5 border-white/5 text-sm text-gray-200 placeholder:text-gray-600 focus-visible:ring-[#00A3FF]/30"
              />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {isLoadingConvs ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-6 w-6 animate-spin text-[#00A3FF]" />
              </div>
            ) : filteredConvs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 p-8 text-center">
                <div className="h-14 w-14 rounded-full bg-white/5 flex items-center justify-center">
                  <MessageSquare className="h-6 w-6 text-gray-600" />
                </div>
                <p className="text-sm text-gray-500">Nenhuma conversa ainda</p>
                <p className="text-xs text-gray-600 mb-2">
                  Clique no <strong className="text-gray-400">+</strong> acima para iniciar uma nova conversa com qualquer número.
                </p>
                <Button
                  size="sm"
                  onClick={() => setIsNewConvOpen(true)}
                  className="bg-[#00A3FF]/10 hover:bg-[#00A3FF]/20 text-[#00A3FF] border border-[#00A3FF]/20 gap-2"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Nova Conversa
                </Button>
              </div>
            ) : (
              filteredConvs.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConv(conv)}
                  className={cn(
                    "w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/[0.03] border-b border-white/[0.03]",
                    selectedConv?.id === conv.id && "bg-[#00A3FF]/5 border-l-2 border-l-[#00A3FF]"
                  )}
                >
                  <div className="relative">
                    <ContactAvatar name={conv.contact_name || conv.contact_phone} phone={conv.contact_phone} />
                    <Circle className="absolute -bottom-0.5 -right-0.5 h-3 w-3 fill-emerald-500 text-emerald-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-gray-100 truncate">
                        {conv.contact_name || conv.contact_phone}
                      </span>
                      <span className="text-[10px] text-gray-600 flex-shrink-0">{formatTime(conv.last_message_at)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-gray-500 truncate">{conv.last_message || "..."}</p>
                      {conv.unread_count > 0 && (
                        <span className="flex-shrink-0 min-w-[18px] bg-[#00A3FF] rounded-full text-[9px] font-bold text-white flex items-center justify-center px-1 h-4">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* ===== CHAT PANEL ===== */}
        <div className={cn(
          "flex-1 flex flex-col",
          !isMobileView && !selectedConv ? "hidden md:flex" : "flex",
          isMobileView && !selectedConv ? "hidden" : ""
        )}>
          {selectedConv ? (
            <>
              {/* Chat Header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-[#0D0D12]">
                <button
                  onClick={() => { setSelectedConv(null); setIsMobileView(false) }}
                  className="md:hidden text-gray-400 hover:text-white"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <ContactAvatar name={selectedConv.contact_name || selectedConv.contact_phone} phone={selectedConv.contact_phone} size="md" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">{selectedConv.contact_name || selectedConv.contact_phone}</p>
                  <p className="text-[11px] text-gray-500 font-mono">{selectedConv.contact_phone}</p>
                </div>
                <a
                  href={`https://wa.me/${selectedConv.contact_phone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-green-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-green-500/10 border border-white/5"
                >
                  <Phone className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">WhatsApp</span>
                </a>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-[#080810]">
                {isLoadingMsgs ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin text-[#00A3FF]" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
                    <div className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center">
                      <MessageSquare className="h-5 w-5 text-gray-600" />
                    </div>
                    <p className="text-sm text-gray-500">Conversa vazia</p>
                    <p className="text-xs text-gray-600">Envie uma mensagem para iniciar o atendimento.</p>
                  </div>
                ) : (
                  <>
                    {messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Input Bar */}
              <div className="p-3 border-t border-white/5 bg-[#0D0D12]">
                <div className="flex items-center gap-2 bg-white/5 rounded-xl border border-white/5 px-4 py-2 focus-within:border-[#00A3FF]/40 transition-colors">
                  <input
                    ref={inputRef}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Digite uma mensagem..."
                    className="flex-1 bg-transparent text-sm text-gray-100 placeholder:text-gray-600 outline-none"
                    disabled={isSending}
                  />
                  <Button
                    size="icon"
                    onClick={handleSend}
                    disabled={!newMessage.trim() || isSending}
                    className="h-8 w-8 rounded-lg bg-[#00A3FF] hover:bg-[#00A3FF]/80 flex-shrink-0 transition-all disabled:opacity-30"
                  >
                    {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-[10px] text-gray-700 mt-1.5 text-center">Enter para enviar · Shift+Enter para nova linha</p>
              </div>
            </>
          ) : (
            // Empty State
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
              <div className="relative">
                <div className="h-20 w-20 rounded-2xl bg-[#00A3FF]/10 border border-[#00A3FF]/20 flex items-center justify-center">
                  <MessageSquare className="h-9 w-9 text-[#00A3FF]" />
                </div>
                {totalUnread > 0 && (
                  <div className="absolute -top-1 -right-1 h-5 w-5 bg-emerald-500 rounded-full border-2 border-[#0A0A0E] flex items-center justify-center">
                    <span className="text-[8px] font-bold text-white">{totalUnread}</span>
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-base font-semibold text-white mb-1">Selecione uma conversa</h3>
                <p className="text-sm text-gray-500 max-w-xs">
                  Escolha um contato na lista ou inicie uma nova conversa.
                </p>
              </div>
              <Button
                onClick={() => setIsNewConvOpen(true)}
                className="bg-[#00A3FF] hover:bg-[#00A3FF]/80 text-white gap-2 mt-1"
              >
                <UserPlus className="h-4 w-4" />
                Nova Conversa
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ===== DIALOG: Nova Conversa ===== */}
      <Dialog open={isNewConvOpen} onOpenChange={setIsNewConvOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Nova Conversa</DialogTitle>
            <DialogDescription>
              Inicie um atendimento com qualquer número de WhatsApp.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="nc-phone">Número WhatsApp <span className="text-red-400">*</span></Label>
              <Input
                id="nc-phone"
                value={newConvPhone}
                onChange={(e) => setNewConvPhone(e.target.value)}
                placeholder="Ex: 11999998888 ou +5511999998888"
                className="font-mono"
              />
              <p className="text-[11px] text-gray-500">Código do país + DDD + número. Ex: 5511999998888</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nc-name">Nome do Contato <span className="text-gray-500 text-xs">(opcional)</span></Label>
              <Input
                id="nc-name"
                value={newConvName}
                onChange={(e) => setNewConvName(e.target.value)}
                placeholder="Ex: João da Silva"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nc-msg">Primeira Mensagem <span className="text-red-400">*</span></Label>
              <textarea
                id="nc-msg"
                value={newConvMsg}
                onChange={(e) => setNewConvMsg(e.target.value)}
                placeholder="Olá! Preciso de ajuda com..."
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-gray-100 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00A3FF]/50 resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsNewConvOpen(false)} disabled={isCreatingConv}>
              Cancelar
            </Button>
            <Button onClick={handleCreateConversation} disabled={isCreatingConv} className="bg-[#00A3FF] hover:bg-[#00A3FF]/80 gap-2">
              {isCreatingConv ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {isCreatingConv ? "Enviando..." : "Iniciar Conversa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
