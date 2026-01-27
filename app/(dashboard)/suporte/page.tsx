"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { MessageCircle, Headphones, ArrowRight, Zap, Send, Bot, User as UserIcon, Loader2 } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"

interface Message {
  role: "user" | "assistant"
  content: string
}

export default function SuportePage() {
  const suporteUrl = process.env.NEXT_PUBLIC_SUPORTE_URL || "#"
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Olá! Sou o Assistente ProspektIA. Como posso te ajudar com os seus leads hoje?"
    }
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [threadId, setThreadId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input
    setInput("")
    setMessages(prev => [...prev, { role: "user", content: userMessage }])
    setIsLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()

      const res = await fetch("/api/support/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          message: userMessage,
          threadId: threadId
        })
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Erro desconhecido na API" }))
        throw new Error(errorData.error || `Erro ${res.status}: Falha ao enviar mensagem`)
      }

      const data = await res.json()

      if (data.threadId) {
        setThreadId(data.threadId)
      }

      setMessages(prev => [...prev, { role: "assistant", content: data.response }])

    } catch (error: any) {
      console.error(error)
      let errorMessage = "Desculpe, tive um problema ao processar sua mensagem. Por favor, tente novamente ou contate o suporte humano."

      if (error.message?.includes("Assistant ID")) {
        errorMessage = "⚠️ CONFIGURAÇÃO NECESSÁRIA: O ID do Assistente OpenAI não foi configurado. Por favor, adicione 'OPENAI_ASSISTANT_ID' ao seu arquivo .env e reinicie o servidor."
      } else if (error.message?.includes("API Key")) {
        errorMessage = "⚠️ CONFIGURAÇÃO NECESSÁRIA: A chave da API OpenAI não foi configurada. Verifique 'NEXT_PUBLIC_CHATGPT_KEY' no seu .env."
      } else if (error.message?.includes("Profile not found")) {
        errorMessage = "Erro de Permissão: Não foi possível acessar seu perfil. Tente fazer login novamente."
      }

      setMessages(prev => [...prev, {
        role: "assistant",
        content: errorMessage
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-120px)] p-1 animate-in fade-in-50 duration-500">

      {/* Human Support Block (WhatsApp) - 30% width on Desktop */}
      <div className="w-full lg:w-[30%] flex flex-col gap-4">
        <Card className="border-primary/20 bg-black/40 backdrop-blur-md h-full flex flex-col justify-center relative group overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-50" />

          <CardContent className="p-6 space-y-6 relative flex flex-col items-center text-center h-full justify-center">

            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center shadow-[0_0_30px_-5px_rgba(37,99,235,0.4)] mb-2">
              <Headphones className="h-8 w-8 text-white" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold">Suporte Humano</h2>
              <p className="text-sm text-muted-foreground">
                Questões complexas? Nossa equipe está online.
              </p>
            </div>

            <Link href={suporteUrl} target="_blank" className="w-full">
              <Button className="w-full h-12 font-bold bg-[#25D366] hover:bg-[#128C7E] text-white shadow-[0_0_15px_rgba(37,211,102,0.2)] hover:shadow-[0_0_25px_rgba(37,211,102,0.4)] transition-all duration-300 group">
                <MessageCircle className="mr-2 h-5 w-5" />
                WhatsApp
                <ArrowRight className="ml-2 h-4 w-4 opacity-50 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* AI Chat Block - 70% width on Desktop */}
      <div className="w-full lg:w-[70%] h-full">
        <Card className="h-full border-border/50 bg-background/50 backdrop-blur-sm flex flex-col shadow-xl overflow-hidden">
          <CardHeader className="border-b border-border/50 px-6 py-4 bg-muted/20">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                <Bot className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Assistente ProspektIA</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">IA Online</span>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-hidden p-0 flex flex-col">
            {/* Messages Area */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
            >
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "flex w-full items-start gap-3",
                    msg.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {msg.role === "assistant" && (
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex shrink-0 items-center justify-center border border-primary/20 mt-1">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}

                  <div
                    className={cn(
                      "px-4 py-3 rounded-2xl max-w-[80%] text-sm leading-relaxed shadow-sm",
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-none"
                        : "bg-muted text-foreground rounded-tl-none border border-border/50"
                    )}
                  >
                    {msg.content}
                  </div>

                  {msg.role === "user" && (
                    <div className="h-8 w-8 rounded-full bg-muted flex shrink-0 items-center justify-center border border-border mt-1">
                      <UserIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex w-full items-start gap-3 justify-start">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex shrink-0 items-center justify-center border border-primary/20 mt-1">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="bg-muted border border-border/50 px-4 py-3 rounded-2xl rounded-tl-none flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce"></span>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-background/50 border-t border-border/50">
              <div className="flex gap-2 relative">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Digite sua dúvida aqui..."
                  className="pr-12 bg-muted/30 border-primary/10 focus-visible:ring-primary/20 h-12"
                  disabled={isLoading}
                />
                <Button
                  onClick={handleSend}
                  disabled={isLoading || !input.trim()}
                  size="icon"
                  className={cn(
                    "absolute right-1 top-1 h-10 w-10 transition-all",
                    input.trim() ? "bg-primary text-primary-foreground" : "bg-transparent text-muted-foreground"
                  )}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
