"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import {
  Send, MessageSquare, Search, Loader2, CheckCheck, Check, Clock,
  ArrowLeft, Phone, Circle, Plus, X, UserPlus, Paperclip, Bot, BotOff, PenTool,
  ChevronRight, DollarSign, FileText, User
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { Label as KanbanLabel } from "@/types/kanban"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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
  labels?: KanbanLabel[]
  lead_id?: string
  lead_pausado?: boolean | null
  profile_pic_url?: string
}

interface Message {
  id: string
  conversation_id: string
  content: string
  from_me: boolean
  status: string
  created_at: string
  whatsapp_message_id?: string
  media_url?: string
  media_type?: string
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

function ContactAvatar({ name, phone, size = "md", picUrl }: { name: string; phone: string; size?: "sm" | "md" | "lg", picUrl?: string }) {
  const sizeClass = { sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-12 w-12 text-base" }[size]
  if (picUrl) {
    return <img src={picUrl} alt={name} className={cn("rounded-full object-cover flex-shrink-0", sizeClass)} />
  }
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
        {message.media_url && message.media_type === 'image' && (
          <div className="mb-2 -mx-2 -mt-1 rounded-xl overflow-hidden max-w-[240px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={message.media_url} alt="Mídia" className="w-full h-auto object-cover" />
          </div>
        )}
        {message.media_url && (message.media_type === 'audio' || message.media_type === 'ptt') && (
          <div className="mb-2 -mx-2 -mt-1 min-w-[200px] max-w-[260px]">
            <audio controls src={message.media_url} className="w-full" style={{ height: '45px' }} />
          </div>
        )}
        {message.media_url && message.media_type === 'video' && (
          <div className="mb-2 -mx-2 -mt-1 rounded-xl overflow-hidden max-w-[240px]">
            <video controls src={message.media_url} className="w-full h-auto object-cover" />
          </div>
        )}
        {message.media_url && !['image', 'audio', 'ptt', 'video'].includes(message.media_type || '') && (
          <a href={message.media_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 mb-2 p-2 bg-black/20 rounded-lg text-xs hover:bg-black/30 transition-colors">
            <Paperclip className="h-4 w-4" /> Baixar Anexo
          </a>
        )}
        <p className="leading-relaxed break-words whitespace-pre-wrap">
          {message.content?.split(/(\*[^*]+\*)/g).map((part, i) =>
            part.startsWith('*') && part.endsWith('*') ? (
              <strong key={i}>{part.slice(1, -1)}</strong>
            ) : (
              part
            )
          )}
        </p>
        <div className={cn("flex items-center gap-1 mt-1", isMe ? "justify-end" : "justify-start")}>
          <span className={cn("text-[10px]", isMe ? "text-blue-100/70" : "text-gray-500")}>
            {formatTime(message.created_at)}
          </span>
          {isMe && (
            message.status === "read" ? <CheckCheck className="h-4 w-4 text-[#53bdeb]" /> :
            message.status === "delivered" ? <CheckCheck className="h-4 w-4 text-gray-400" /> :
            message.status === "sending" ? <Clock className="h-3 w-3 text-gray-400" /> :
            <Check className="h-4 w-4 text-gray-400" />
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
  const [isUploading, setIsUploading] = useState(false)
  const [search, setSearch] = useState("")
  const [isMobileView, setIsMobileView] = useState(false)
  const [availableLabels, setAvailableLabels] = useState<KanbanLabel[]>([])

  // Nova Conversa Dialog
  const [isNewConvOpen, setIsNewConvOpen] = useState(false)
  const [newConvPhone, setNewConvPhone] = useState("")
  const [newConvName, setNewConvName] = useState("")
  const [newConvMsg, setNewConvMsg] = useState("")
  const [isCreatingConv, setIsCreatingConv] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const processedUrlRef = useRef(false)
  const searchParams = useSearchParams()
  const router = useRouter()

  // Signatures
  const [availableSignatures, setAvailableSignatures] = useState<string[]>([])
  const [activeSignature, setActiveSignature] = useState<string>("")
  const [newSignature, setNewSignature] = useState("")

  // Sidebar do Contato
  const [isContactSidebarOpen, setIsContactSidebarOpen] = useState(false)
  const [leadDetails, setLeadDetails] = useState<{
    id?: string;
    full_name: string;
    detalhes: string;
    valor: string;
  } | null>(null)
  const [isSavingLead, setIsSavingLead] = useState(false)
  const [isLoadingLead, setIsLoadingLead] = useState(false)

  // ---- Load User ----
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }: { data: { user: any } }) => {
      if (user) {
        setUserId(user.id)
        if (user.user_metadata?.signatures) {
          setAvailableSignatures(user.user_metadata.signatures)
        }
      }
    })
    
    const savedSignature = localStorage.getItem('chat_active_signature')
    if (savedSignature) {
      setActiveSignature(savedSignature)
    }
  }, [])

  // ---- Auto-open from CRM (?phone=...&name=...) ----
  useEffect(() => {
    if (isLoadingConvs) return;
    if (processedUrlRef.current) return;

    const phone = searchParams.get('phone')
    const name = searchParams.get('name')
    if (phone) {
      processedUrlRef.current = true;
      const cleanPhone = phone.replace(/\D/g, "")
      const existingConv = conversations.find(c => c.contact_phone === cleanPhone)

      if (existingConv) {
        setSelectedConv(existingConv)
        setMessages([])
        setIsMobileView(true)
      } else {
        setNewConvPhone(phone)
        setNewConvName(name || '')
        setIsNewConvOpen(true)
      }
      
      router.replace('/atendimento')
    }
  }, [searchParams, conversations, isLoadingConvs, router])

  // ---- Load Conversations ----
  const loadConversations = useCallback(async () => {
    if (!userId) return
    setIsLoadingConvs(true)
    const { data, error } = await supabase
      .from("conversations")
      .select(`
        *,
        leads!leads_conversation_id_fkey (
          id,
          lead_pausado,
          lead_labels (
            labels (
              id,
              title,
              color
            )
          )
        )
      `)
      .eq("user_id", userId)
      .order("last_message_at", { ascending: false })
      
    if (!error && data) {
      const formatted = data.map((conv: any) => {
        // Como o relacionamento é OneToMany pela ótica do DB, 'leads' vem como array. Pegamos o primeiro.
        const firstLead = (Array.isArray(conv.leads) ? conv.leads[0] : conv.leads) || null
        const flatLabels = firstLead?.lead_labels?.map((ll: any) => ll.labels).filter(Boolean) || []
        return { 
            ...conv, 
            lead_id: firstLead?.id || conv.lead_id, 
            lead_pausado: firstLead?.lead_pausado || false,
            labels: flatLabels 
        }
      })
      setConversations(formatted)
      setFilteredConvs(formatted)
    }
    setIsLoadingConvs(false)
  }, [userId])

  const loadLabels = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase.from('labels').select('*').eq('user_id', userId)
    if (data) setAvailableLabels(data)
  }, [userId])

  useEffect(() => { loadConversations() }, [loadConversations])
  useEffect(() => { loadLabels() }, [loadLabels])

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
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations', filter: `user_id=eq.${userId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newConv = payload.new as Conversation
            setConversations(prev => {
              if (prev.find(c => c.id === newConv.id)) return prev
              return [newConv, ...prev]
            })
          } else if (payload.eventType === 'UPDATE') {
            const updatedConv = payload.new as Conversation
            setConversations(prev => {
                const updatedList = prev.map(c => {
                    if (c.id === updatedConv.id) {
                        return { 
                            ...c, 
                            ...updatedConv,
                            lead_id: c.lead_id || updatedConv.lead_id,
                            lead_pausado: c.lead_pausado,
                            labels: c.labels
                        }
                    }
                    return c
                })
                return updatedList.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime())
            })
            setSelectedConv(prev => {
                if (prev?.id === updatedConv.id) {
                    return { 
                        ...prev, 
                        ...updatedConv,
                        lead_id: prev.lead_id || updatedConv.lead_id,
                        lead_pausado: prev.lead_pausado,
                        labels: prev.labels
                    }
                }
                return prev
            })
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
    if (!error && data) {
      const validMessages = data.filter((m: any) => m.content?.trim() || m.media_url)
      setMessages(validMessages)
    }
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
          if (!payload.new.content?.trim() && !payload.new.media_url) return
          setMessages(prev => prev.find(m => m.id === payload.new.id || (m.whatsapp_message_id && m.whatsapp_message_id === payload.new.whatsapp_message_id)) ? prev : [...prev, payload.new as Message])
        })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [selectedConv?.id, loadMessages])

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages])
  useEffect(() => { if (selectedConv) setTimeout(() => inputRef.current?.focus(), 100) }, [selectedConv])

  // ---- Lead Sidebar Functions ----
  const fetchLeadDetails = useCallback(async () => {
    if (!selectedConv?.lead_id) return
    setIsLoadingLead(true)
    const { data, error } = await supabase
      .from('leads')
      .select('id, full_name, detalhes, valor')
      .eq('id', selectedConv.lead_id)
      .single()
    if (!error && data) {
      setLeadDetails({
        id: data.id,
        full_name: data.full_name || '',
        detalhes: data.detalhes || '',
        valor: data.valor?.toString() || ''
      })
    }
    setIsLoadingLead(false)
  }, [selectedConv?.lead_id])

  useEffect(() => {
    if (isContactSidebarOpen && selectedConv?.lead_id) {
      fetchLeadDetails()
    } else {
      setLeadDetails(null)
    }
  }, [isContactSidebarOpen, selectedConv?.lead_id, fetchLeadDetails])

  const handleUpdateLead = async () => {
    if (!selectedConv?.lead_id || !leadDetails) return
    setIsSavingLead(true)
    
    // Preparar valor numerico seguro
    let safeValor: number | null = null
    if (leadDetails.valor) {
        const parsed = parseFloat(leadDetails.valor.replace(',', '.'))
        if (!isNaN(parsed)) safeValor = parsed
    }

    const { error } = await supabase
      .from('leads')
      .update({
        full_name: leadDetails.full_name,
        detalhes: leadDetails.detalhes,
        valor: safeValor
      })
      .eq('id', selectedConv.lead_id)

    if (error) {
      toast.error("Erro ao salvar dados do contato.")
    } else {
      toast.success("Dados atualizados com sucesso!")
      // Atualizar o nome no selectedConv e conversations locais para refletir a mudanca instantaneamente
      setConversations(prev => prev.map(c => c.id === selectedConv.id ? { ...c, contact_name: leadDetails.full_name } : c))
      setSelectedConv(prev => prev ? { ...prev, contact_name: leadDetails.full_name } : prev)
    }
    setIsSavingLead(false)
  }


  // ---- Send Message ----
  const handleSend = async (mediaUrl?: string, mediaType?: string) => {
    if ((!newMessage.trim() && !mediaUrl) || !selectedConv || isSending) return
    let content = newMessage.trim()
    if (content && activeSignature) {
      content = `*${activeSignature}:*\n${content}`
    }
    content = content || "[Mídia]"
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
        body: JSON.stringify({ conversation_id: selectedConv.id, contact_phone: selectedConv.contact_phone, content, media_url: mediaUrl, media_type: mediaType }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Erro ao enviar mensagem")
        setMessages(prev => prev.filter(m => m.id !== tempMsg.id))
        setNewMessage(content)
        return
      }
      setMessages(prev => {
        const withoutTemp = prev.filter(m => m.id !== tempMsg.id)
        if (!withoutTemp.find(m => m.id === data.message.id || (m.whatsapp_message_id && m.whatsapp_message_id === data.message.whatsapp_message_id))) {
          return [...withoutTemp, data.message]
        }
        return withoutTemp
      })
    } catch {
      toast.error("Erro de conexão ao enviar mensagem")
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id))
      setNewMessage(content)
    } finally {
      setIsSending(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedConv) return
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("O arquivo deve ter no máximo 5MB")
      return
    }

    setIsUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${selectedConv.id}/${Math.random().toString(36).substring(2)}.${fileExt}`
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat_media')
        .upload(fileName, file, { upsert: false })
        
      if (uploadError) {
          // Verify if bucket exists
          if (uploadError.message.includes('Bucket not found')) {
              toast.error("Bucket 'chat_media' não foi criado no Supabase.")
              return
          }
          throw uploadError
      }

      const { data: { publicUrl } } = supabase.storage.from('chat_media').getPublicUrl(fileName)
      
      let mediaType = 'document'
      if (file.type.startsWith('image/')) mediaType = 'image'
      else if (file.type.startsWith('video/')) mediaType = 'video'
      else if (file.type.startsWith('audio/')) mediaType = 'audio'

      await handleSend(publicUrl, mediaType)
    } catch (err: any) {
      toast.error(`Erro ao enviar arquivo: ${err.message}`)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }


  // ---- Nova Conversa ----
  const handleCreateConversation = async () => {
    let phone = newConvPhone.replace(/\D/g, "")
    let firstMsg = newConvMsg.trim()
    if (firstMsg && activeSignature) {
      firstMsg = `*${activeSignature}:*\n${firstMsg}`
    }

    if (!phone || phone.length < 10) {
      toast.warning("Digite um número de WhatsApp válido")
      return
    }
    if (!firstMsg) {
      toast.warning("Digite uma mensagem para enviar")
      return
    }

    // Remove o prefixo 55 (DDI Brasil) para salvar no padrão do sistema
    // O webhook e n8n salvam sem o 55, então mantemos consistência
    if (phone.length === 13 && phone.startsWith('55')) {
      phone = phone.slice(2)
    } else if (phone.length === 12 && phone.startsWith('55')) {
      phone = phone.slice(2)
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

      // 2. Upsert do lead no CRM/Kanban — mantém tudo sincronizado
      try {
        const { data: existingLead } = await supabase
          .from("leads")
          .select("id")
          .eq("user_id", userId)
          .eq("whatsapp", phone)
          .maybeSingle()

        if (!existingLead) {
          // Busca a primeira coluna (position 0) para colocar o lead
          const { data: firstCol, error: colErr } = await supabase
            .from("kanban_columns")
            .select("id")
            .eq("user_id", userId)
            .order("position", { ascending: true })
            .limit(1)
            .maybeSingle()

          if (colErr) console.warn("CRM: erro ao buscar primeira coluna:", colErr)
          if (!firstCol) console.warn("CRM: nenhuma coluna encontrada para user_id:", userId)

          const { error: leadInsertErr } = await supabase.from("leads").insert({
            user_id: userId,
            full_name: newConvName.trim() || phone,
            whatsapp: phone,
            origin: "WhatsApp",
            column_id: firstCol?.id || null,
            last_message: firstMsg,
            last_message_at: new Date().toISOString(),
            conversation_id: conv.id,
          })

          if (leadInsertErr) console.warn("CRM: erro ao inserir lead:", leadInsertErr)
          else console.log(`CRM: Lead criado para ${phone} na coluna ${firstCol?.id ?? 'sem coluna'}`)
        } else {
          // Lead já existe — apenas atualiza last_message e vincula conversa
          await supabase.from("leads").update({
            last_message: firstMsg,
            last_message_at: new Date().toISOString(),
            conversation_id: conv.id,
          }).eq("id", existingLead.id)
        }
      } catch (leadErr) {
        console.warn("Aviso: não foi possível sincronizar lead no CRM:", leadErr)
        // Não bloqueia o fluxo — a conversa já foi criada
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

  const handleRemoveLabel = async (leadId: string | undefined | null, labelId: string) => {
    if (!leadId) {
        toast.warning("Sem registro de CRM para remover a etiqueta.")
        return
    }
    
    try {
        const { error } = await supabase
            .from('lead_labels')
            .delete()
            .eq('lead_id', leadId)
            .eq('label_id', labelId)

        if (error) throw error

        // Atualiza UI instantaneamente retirando a tag
        setConversations(prev => prev.map(c => {
            if (c.lead_id === leadId) {
                return { ...c, labels: c.labels?.filter(l => l.id !== labelId) }
            }
            return c
        }))
        
        setSelectedConv(prev => {
            if (prev && prev.lead_id === leadId) {
                return { ...prev, labels: prev.labels?.filter(l => l.id !== labelId) }
            }
            return prev
        })
        
    } catch (err) {
        toast.error("Erro ao remover etiqueta")
    }
  }

  const handleAddLabel = async (leadId: string | undefined | null, labelId: string) => {
    if (!leadId) {
        toast.warning("Sem registro correspondente do CRM (Lead ID Null).")
        return
    }
    try {
        const { error } = await supabase.from('lead_labels').insert({ lead_id: leadId, label_id: labelId })
        if (error) {
            toast.error(`Erro: ${error.message}`)
            throw error
        }
        
        const labelToAdd = availableLabels.find(l => l.id === labelId)
        if (!labelToAdd) return

        // Tentar atualizar o React
        setConversations(prev => prev.map(c => {
            if (c.lead_id === leadId) {
                const currentLabels = c.labels || []
                if (!currentLabels.find(l => l.id === labelToAdd.id)) {
                    return { ...c, labels: [...currentLabels, labelToAdd] }
                }
            }
            return c
        }))
        
        setSelectedConv(prev => {
            if (prev && prev.lead_id === leadId) {
                const currentLabels = prev.labels || []
                if (!currentLabels.find(l => l.id === labelToAdd.id)) {
                    return { ...prev, labels: [...currentLabels, labelToAdd] }
                }
            }
            return prev
        })
        
    } catch (err: any) {
        console.error("Adicionar Etiqueta Error:", err)
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

  const handleToggleIAPause = async () => {
    if (!selectedConv?.lead_id) {
        toast.error("Este contato ainda não está vinculado ao CRM.");
        return;
    }
    const newValue = !selectedConv.lead_pausado;
    
    // UI optimistic update
    setSelectedConv(prev => prev ? { ...prev, lead_pausado: newValue } : prev);
    setConversations(prev => prev.map(c => c.id === selectedConv?.id ? { ...c, lead_pausado: newValue } : c));
    
    try {
        const { error } = await supabase.from('leads').update({ lead_pausado: newValue }).eq('id', selectedConv.lead_id);
        if (error) throw error;
        toast.success(newValue ? "IA silenciada para este contato 🤫" : "IA ativada para este contato 🤖");
    } catch (err: any) {
        console.error("Erro ao pausar IA:", err);
        toast.error("Erro ao alterar o status da IA");
        // Revert on error
        setSelectedConv(prev => prev ? { ...prev, lead_pausado: !newValue } : prev);
        setConversations(prev => prev.map(c => c.id === selectedConv?.id ? { ...c, lead_pausado: !newValue } : c));
    }
  }

  // ---- Signatures ----
  const handleAddSignature = async () => {
    if (!newSignature.trim()) return
    const updated = [...availableSignatures, newSignature.trim()]
    setAvailableSignatures(updated)
    setNewSignature("")
    toast.success("Assinatura adicionada")
    
    await supabase.auth.updateUser({
      data: { signatures: updated }
    })
  }

  const handleDeleteSignature = async (sig: string) => {
    const updated = availableSignatures.filter(s => s !== sig)
    setAvailableSignatures(updated)
    if (activeSignature === sig) handleSelectSignature("")
    toast.success("Assinatura removida")

    await supabase.auth.updateUser({
      data: { signatures: updated }
    })
  }

  const handleSelectSignature = (sig: string) => {
    setActiveSignature(sig)
    if (sig) {
      localStorage.setItem('chat_active_signature', sig)
      toast.success(`Escrevendo como: ${sig}`)
    } else {
      localStorage.removeItem('chat_active_signature')
      toast.success("Assinatura desativada")
    }
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
                    <ContactAvatar name={conv.contact_name || conv.contact_phone} phone={conv.contact_phone} picUrl={conv.profile_pic_url} />
                    <Circle className="absolute -bottom-0.5 -right-0.5 h-3 w-3 fill-emerald-500 text-emerald-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-gray-100 truncate">
                        {conv.contact_name || conv.contact_phone}
                      </span>
                      <span className="text-[10px] text-gray-600 flex-shrink-0">{formatTime(conv.last_message_at)}</span>
                    </div>
                    
                    {/* Renderização das Badges/Etiquetas */}
                    {conv.labels && conv.labels.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        {conv.labels.map(label => (
                          <div 
                            key={label.id} 
                            style={{ backgroundColor: label.color }} 
                            className="text-[9px] uppercase font-bold text-white px-1.5 py-0.5 rounded-sm line-clamp-1 truncate max-w-[80px]"
                            title={label.title}
                          >
                            {label.title}
                          </div>
                        ))}
                      </div>
                    )}
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
                <button 
                  onClick={() => setIsContactSidebarOpen(prev => !prev)}
                  className="flex items-center gap-3 hover:bg-white/5 p-1.5 -ml-1.5 rounded-lg transition-colors text-left flex-1"
                  title="Ver dados do contato"
                >
                  <ContactAvatar name={selectedConv.contact_name || selectedConv.contact_phone} phone={selectedConv.contact_phone} size="md" picUrl={selectedConv.profile_pic_url} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-white truncate">{selectedConv.contact_name || selectedConv.contact_phone}</p>
                        <p className="text-[11px] text-gray-500 font-mono hidden sm:block flex-shrink-0">{selectedConv.contact_phone}</p>
                    </div>
                  {/* Etiquetas no Cabeçalho do Chat */}
                  <div className="flex flex-wrap items-center gap-1 mt-1">
                      {selectedConv.labels && selectedConv.labels.map(label => (
                          <div 
                            key={label.id} 
                            style={{ backgroundColor: label.color }} 
                            className="flex items-center gap-1 text-[9px] uppercase font-bold text-white pl-1.5 pr-0.5 py-0.5 rounded-sm"
                          >
                            <span>{label.title}</span>
                            <button 
                                onClick={() => handleRemoveLabel(selectedConv.lead_id, label.id)} 
                                className="hover:bg-black/20 rounded-sm p-[1px] transition-colors"
                                title="Remover etiqueta"
                            >
                                <X className="h-2.5 w-2.5" />
                            </button>
                          </div>
                      ))}
                      
                      <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                              <button 
                                onClick={(e) => e.stopPropagation()} // Prevent sidebar toggle when clicking plus
                                className="flex items-center justify-center h-4 w-4 rounded-sm border border-dashed border-gray-600 hover:border-gray-400 hover:bg-white/5 transition-colors text-gray-400 hover:text-white" 
                                title="Adicionar etiqueta ao lead"
                              >
                                  <Plus className="h-3 w-3" />
                              </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-48 bg-[#1A1A23] border-white/10">
                              {availableLabels.length === 0 ? (
                                  <div className="px-2 py-2 text-xs text-gray-500 text-center">Nenhuma etiqueta criada no CRM</div>
                              ) : (
                                  availableLabels.map(lbl => {
                                      const hasLabel = selectedConv.labels?.some(l => l.id === lbl.id)
                                      return (
                                        <DropdownMenuItem 
                                            key={lbl.id}
                                            disabled={hasLabel}
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleAddLabel(selectedConv.lead_id, lbl.id)
                                            }}
                                            className="text-xs text-gray-200 cursor-pointer flex items-center gap-2 hover:bg-white/5 data-[highlighted]:bg-white/10 outline-none"
                                        >
                                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: lbl.color }} />
                                            <span className="truncate">{lbl.title}</span>
                                            {hasLabel && <Check className="h-3 w-3 ml-auto opacity-50 flex-shrink-0" />}
                                        </DropdownMenuItem>
                                      )
                                  })
                              )}
                          </DropdownMenuContent>
                      </DropdownMenu>
                  </div>
                </div>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleToggleIAPause}
                    className={cn(
                        "flex items-center gap-1.5 text-xs font-medium transition-colors px-3 py-1.5 rounded-lg border",
                        selectedConv.lead_pausado 
                            ? "bg-[#D4A373]/10 text-[#D4A373] border-[#D4A373]/20 hover:bg-[#D4A373]/20" 
                            : "bg-[#00A3FF]/10 text-[#00A3FF] border-[#00A3FF]/20 hover:bg-[#00A3FF]/20"
                    )}
                    title={selectedConv.lead_pausado ? "Retomar respostas automáticas da IA" : "Pausar respostas automáticas da IA"}
                  >
                    {selectedConv.lead_pausado ? <BotOff className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                    <span className="hidden sm:inline">{selectedConv.lead_pausado ? "IA Pausada" : "Pausar IA"}</span>
                  </button>

                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        className={cn(
                          "flex items-center gap-1.5 text-xs font-medium transition-colors px-3 py-1.5 rounded-lg border",
                          activeSignature
                            ? "bg-purple-500/10 text-purple-400 border-purple-500/20 hover:bg-purple-500/20"
                            : "bg-white/5 text-gray-400 border-white/5 hover:bg-white/10"
                        )}
                        title="Assinatura de Atendente"
                      >
                        <PenTool className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{activeSignature || "Assinatura"}</span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-3 border-[#2A2D35] bg-[#1C1D22] text-sm" align="end">
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium text-white mb-2 text-xs uppercase tracking-wider text-gray-400">Assinatura Ativa</h4>
                          {availableSignatures.length === 0 ? (
                            <p className="text-gray-500 text-xs">Nenhuma assinatura criada.</p>
                          ) : (
                            <div className="space-y-1">
                              <button
                                onClick={() => handleSelectSignature("")}
                                className={cn(
                                  "w-full flex items-center justify-between px-2 py-1.5 text-xs rounded-md transition-colors",
                                  activeSignature === "" ? "bg-white/10 text-white" : "text-gray-400 hover:bg-white/5"
                                )}
                              >
                                Nenhum
                                {activeSignature === "" && <Check className="h-3 w-3" />}
                              </button>
                              {availableSignatures.map(sig => (
                                <div key={sig} className="flex items-center group">
                                  <button
                                    onClick={() => handleSelectSignature(sig)}
                                    className={cn(
                                      "flex-1 flex items-center justify-between px-2 py-1.5 text-xs rounded-md transition-colors",
                                      activeSignature === sig ? "bg-purple-500/20 text-purple-400" : "text-gray-300 hover:bg-white/5"
                                    )}
                                  >
                                    {sig}
                                    {activeSignature === sig && <Check className="h-3 w-3" />}
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteSignature(sig); }}
                                    className="p-1.5 opacity-0 group-hover:opacity-100 hover:text-red-400 text-gray-500 transition-all rounded-md hover:bg-red-500/10"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="pt-3 border-t border-white/5">
                          <label className="text-xs text-gray-400 mb-1.5 block">Nova Assinatura</label>
                          <div className="flex gap-2">
                            <Input 
                              value={newSignature}
                              onChange={e => setNewSignature(e.target.value)}
                              placeholder="Ex: Ana"
                              className="h-7 text-xs bg-black/20 border-white/10"
                              onKeyDown={e => { if (e.key === 'Enter') handleAddSignature() }}
                            />
                            <Button onClick={handleAddSignature} size="sm" variant="secondary" className="h-7 px-2 bg-white/10 hover:bg-white/20">
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

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
                {activeSignature && (
                  <div className="mb-2 px-1 text-[10px] text-gray-500 flex items-center gap-1.5">
                    <PenTool className="h-3 w-3 text-purple-400" />
                    Enviando mensagem como: <strong className="text-gray-300 font-medium">{activeSignature}</strong>
                  </div>
                )}
                <div className="flex items-center gap-2 bg-white/5 rounded-xl border border-white/5 px-4 py-2 focus-within:border-[#00A3FF]/40 transition-colors">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading || isSending}
                    className="h-8 w-8 text-gray-400 hover:text-white flex-shrink-0"
                    title="Anexar arquivo"
                  >
                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                  </Button>
                  <textarea
                    ref={inputRef as any}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Digite uma mensagem..."
                    rows={1}
                    className="flex-1 bg-transparent text-sm text-gray-100 placeholder:text-gray-600 outline-none resize-none pt-[6px] custom-scrollbar overflow-y-auto"
                    style={{ minHeight: '32px', maxHeight: '120px' }}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = '32px';
                      target.style.height = `${target.scrollHeight}px`;
                    }}
                    disabled={isSending}
                  />
                  <Button
                    size="icon"
                    onClick={() => handleSend()}
                    disabled={(!newMessage.trim() && !isUploading) || isSending}
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

        {/* ===== CONTACT SIDEBAR (RIGHT) ===== */}
        {isContactSidebarOpen && selectedConv && (
          <div className="w-72 flex-shrink-0 border-l border-white/5 bg-[#0D0D12] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Dados do Contato</span>
              <button
                onClick={() => setIsContactSidebarOpen(false)}
                className="text-gray-500 hover:text-white transition-colors p-1 rounded-md hover:bg-white/5"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Avatar + Phone */}
            <div className="flex flex-col items-center py-5 px-4 border-b border-white/5 gap-2">
              <ContactAvatar
                name={selectedConv.contact_name || selectedConv.contact_phone}
                phone={selectedConv.contact_phone}
                size="lg"
                picUrl={selectedConv.profile_pic_url}
              />
              <p className="text-sm font-semibold text-white mt-1">{selectedConv.contact_name || selectedConv.contact_phone}</p>
              <p className="text-xs font-mono text-gray-500">{selectedConv.contact_phone}</p>
            </div>

            {/* Form */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
              {isLoadingLead ? (
                <div className="flex items-center justify-center h-24">
                  <Loader2 className="h-5 w-5 animate-spin text-[#00A3FF]" />
                </div>
              ) : leadDetails ? (
                <>
                  {/* Nome */}
                  <div className="space-y-1.5">
                    <Label className="text-[11px] uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                      <User className="h-3 w-3" /> Nome
                    </Label>
                    <Input
                      value={leadDetails.full_name}
                      onChange={(e) => setLeadDetails(prev => prev ? { ...prev, full_name: e.target.value } : prev)}
                      placeholder="Nome do lead"
                      className="h-8 text-sm bg-white/5 border-white/10 text-gray-100 focus-visible:ring-[#00A3FF]/40"
                    />
                  </div>

                  {/* Valor do Orçamento */}
                  <div className="space-y-1.5">
                    <Label className="text-[11px] uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                      <DollarSign className="h-3 w-3" /> Valor do Orçamento
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">R$</span>
                      <Input
                        value={leadDetails.valor}
                        onChange={(e) => setLeadDetails(prev => prev ? { ...prev, valor: e.target.value } : prev)}
                        placeholder="0,00"
                        className="h-8 text-sm pl-8 bg-white/5 border-white/10 text-gray-100 focus-visible:ring-[#00A3FF]/40"
                        type="text"
                        inputMode="decimal"
                      />
                    </div>
                  </div>

                  {/* Detalhes / Notas */}
                  <div className="space-y-1.5">
                    <Label className="text-[11px] uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                      <FileText className="h-3 w-3" /> Detalhes / Anotações
                    </Label>
                    <Textarea
                      value={leadDetails.detalhes}
                      onChange={(e) => setLeadDetails(prev => prev ? { ...prev, detalhes: e.target.value } : prev)}
                      placeholder="Resumo da conversa, observações, lembretes..."
                      rows={6}
                      className="text-sm bg-white/5 border-white/10 text-gray-100 resize-none focus-visible:ring-[#00A3FF]/40 placeholder:text-gray-600"
                    />
                  </div>
                </>
              ) : (
                <p className="text-xs text-gray-600 text-center pt-4">Este contato não possui um lead vinculado.</p>
              )}
            </div>

            {/* Save Button */}
            {leadDetails && (
              <div className="p-4 border-t border-white/5">
                <Button
                  onClick={handleUpdateLead}
                  disabled={isSavingLead}
                  className="w-full bg-[#00A3FF] hover:bg-[#00A3FF]/80 text-white h-8 text-sm gap-2"
                >
                  {isSavingLead ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  {isSavingLead ? "Salvando..." : "Salvar Dados"}
                </Button>
              </div>
            )}
          </div>
        )}

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
