"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button" // existing
import { Input } from "@/components/ui/input" // new
import { Badge } from "@/components/ui/badge" // new
import { QrCode, CheckCircle2, XCircle, RefreshCw, Smartphone, Loader2, Trash2, Webhook, Copy, RefreshCcw } from "lucide-react" // updated icons
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

// Env vars
const UAZAPI_URL = process.env.NEXT_PUBLIC_UAZAPI_URL
const UAZAPI_ADMIN_TOKEN = process.env.NEXT_PUBLIC_UAZAPI_ADMIN_TOKEN

export default function ConexoesPage() {
  const [loading, setLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)

  // Instance State
  const [instanceName, setInstanceName] = useState<string | null>(null)
  const [instanceToken, setInstanceToken] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<string>("disconnected") // connecting, open, close
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null)

  // Webhook State
  const [webhookToken, setWebhookToken] = useState<string | null>(null)
  const [webhookLoading, setWebhookLoading] = useState(false)

  // 1. Check Supabase on Mount
  useEffect(() => {
    async function checkConnection() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: connection, error } = await supabase
          .from("whatsapp_connections")
          .select("*")
          .eq("user_id", user.id)
          .single()

        if (connection && !error) {
          setInstanceName(connection.instance_name)
          setInstanceToken(connection.instance_key)
          if (connection.status === "connected") {
            setIsConnected(true)
            setConnectionStatus("open")
          } else {
            // If exists but not connected, maybe we need to fetch QR or check state
            setInstanceName(connection.instance_name)
            checkUazapiState(connection.instance_name, connection.instance_key)
          }
        }
      } catch (err) {
        console.error("Error checking connection:", err)
      } finally {
        setLoading(false)
      }
    }

    checkConnection()
    fetchWebhookToken()
  }, [])

  // Webhook Logic
  const fetchWebhookToken = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('webhook_token')
        .eq('id', user.id)
        .single()

      if (profile && profile.webhook_token) {
        setWebhookToken(profile.webhook_token)
      }
    } catch (error) {
      console.error("Error fetching webhook token:", error)
    }
  }

  const handleGenerateWebhookToken = async () => {
    try {
      setWebhookLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Custom UUID v4 generator to avoid 'crypto.randomUUID is not a function' in insecure contexts (localhost)
      const newToken = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });

      const { error } = await supabase
        .from('profiles')
        .update({ webhook_token: newToken })
        .eq('id', user.id)

      if (error) throw error

      setWebhookToken(newToken)
      toast.success("Novo token de Webhook gerado!")
    } catch (error) {
      console.error("Error generating token:", error)
      toast.error("Erro ao gerar token. Tente novamente.")
    } finally {
      setWebhookLoading(false)
    }
  }

  const handleCopyWebhookUrl = () => {
    if (!webhookToken) return
    const url = `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/api/webhook/${webhookToken}`

    // Robust copy fallback for non-secure contexts (http)
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url)
        .then(() => toast.success("URL copiada para a área de transferência"))
        .catch(() => copyToClipboardFallback(url))
    } else {
      copyToClipboardFallback(url)
    }
  }

  const copyToClipboardFallback = (text: string) => {
    const textArea = document.createElement("textarea")
    textArea.value = text
    textArea.style.position = "fixed"
    textArea.style.left = "-9999px"
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    try {
      document.execCommand('copy')
      toast.success("URL copiada para a área de transferência")
    } catch (err) {
      console.error('Falha ao copiar', err)
      toast.error("Erro ao copiar: copie manualmente")
    }
    document.body.removeChild(textArea)
  }

  // Helper to check state directly from UazAPI
  const checkUazapiState = async (instName: string, token: string) => {
    try {
      const res = await fetch(`${UAZAPI_URL}/instance/status`, {
        method: "GET",
        headers: {
          "token": token
        }
      })
      const data = await res.json()
      
      const isConnectedApi = data?.connected === true || 
                             data?.status?.connected === true || 
                             data?.instance?.status === "connected" || 
                             data?.state === "open" || 
                             data?.state === "connected" ||
                             data?.instance?.state === "open";
                             
      const stateString = data?.state || data?.instance?.state || data?.instance?.status || "close";

      if (isConnectedApi) {
        setIsConnected(true)
        setConnectionStatus("open")
        await updateSupabaseStatus(instName, "connected")
      } else {
        setIsConnected(false)
        setConnectionStatus(stateString)
        if (!isConnectedApi) {
          fetchQrCode(instName, token)
        }
      }
    } catch (e) {
      console.error("Error checking UazAPI state:", e)
    }
  }

  // 2. Fetch QR Code
  const fetchQrCode = async (instName: string, token: string) => {
    try {
      const res = await fetch(`${UAZAPI_URL}/instance/connect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "token": token
        },
        body: JSON.stringify({})
      })
      const data = await res.json()
      const qrData = data?.instance?.qrcode || data?.qrcode || data?.base64 || data?.instance?.base64;
      if (qrData) {
        setQrCodeBase64(qrData)
      }
    } catch (e) {
      console.error("Error fetching QR:", e)
    }
  }

  // 3. Create Instance
  const handleGenerateQRCode = async () => {
    setIsCreating(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // --- ZOMBIE CLEANUP START ---
      const { data: existingConn } = await supabase
        .from("whatsapp_connections")
        .select("instance_name, instance_key")
        .eq("user_id", user.id)
        .single()

      if (existingConn && existingConn.instance_name) {
        console.log(`Encontrada instância antiga: ${existingConn.instance_name}. Iniciando limpeza...`)
        try {
          let delRes = await fetch(`${UAZAPI_URL}/instance/delete/${existingConn.instance_name}`, {
            method: "DELETE",
            headers: { "admintoken": UAZAPI_ADMIN_TOKEN as string }
          })
          if (!delRes.ok && existingConn.instance_key) {
            delRes = await fetch(`${UAZAPI_URL}/instance`, {
              method: "DELETE",
              headers: { "token": existingConn.instance_key }
            })
          }
          if (delRes.ok) console.log("Instância antiga deletada na API com sucesso.")
          else console.warn("Falha ao deletar instância antiga na API.")
        } catch (delErr) {
          console.error("Erro ao tentar deletar instância antiga:", delErr)
        }
        await supabase.from("whatsapp_connections").delete().eq("user_id", user.id)
      }
      // --- ZOMBIE CLEANUP END ---

      // --- WEBHOOK TOKEN: busca ou gera ---
      let currentWebhookToken = webhookToken
      if (!currentWebhookToken) {
        // Gera token se não existir
        currentWebhookToken = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0
          const v = c === 'x' ? r : (r & 0x3 | 0x8)
          return v.toString(16)
        })
        await supabase.from('profiles').update({ webhook_token: currentWebhookToken }).eq('id', user.id)
        setWebhookToken(currentWebhookToken)
      }

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
      const webhookUrl = `${appUrl}/api/webhook/${currentWebhookToken}`
      console.log('Webhook URL que será registrada:', webhookUrl)

      const shortId = user.id.slice(0, 3).toUpperCase()
      const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase()
      const newInstanceName = `LEG-${shortId}-${randomSuffix}`

      const payload = {
        name: newInstanceName,
        systemName: "apilocal",
        fingerprintProfile: "chrome",
        browser: "chrome",
        // Registra o webhook na criação da instância
        webhook: webhookUrl,
        webhookEvents: [
          "messages.upsert",
          "messages.update",
          "message",
          "MESSAGES_UPSERT",
        ],
        webhookByEvents: false,
      }

      console.log('Enviando para:', `${UAZAPI_URL}/instance/init`)

      const res = await fetch(`${UAZAPI_URL}/instance/init`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "admintoken": UAZAPI_ADMIN_TOKEN as string
        },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      console.log("Create Response Base:", res.ok, res.status, data)

      let token = ""
      if (res.ok && data.token) {
        token = data.token
      } else if (data.hash && data.hash.token) {
        token = data.hash.token
      } else {
        token = data.token || "ERRO"
      }

      const isSuccess = res.ok && token !== "ERRO"

      if (isSuccess) {
        console.log("Sucesso. Prosseguindo...")

        const { error: dbError } = await supabase.from("whatsapp_connections").upsert({
          user_id: user.id,
          instance_name: newInstanceName,
          instance_key: token,
          status: "connecting",
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' })

        if (dbError) {
          console.error('Erro Detalhado Supabase:', dbError.message)
          throw dbError
        }

        setInstanceName(newInstanceName)
        setInstanceToken(token)

        // Tenta também configurar webhook explicitamente (fallback)
        setTimeout(() => registerWebhook(token, webhookUrl), 500)
        setTimeout(() => fetchQrCode(newInstanceName, token), 1000)

      } else {
        console.error('Falha na criação:', data)
        toast.error(`Erro ao criar: ${data.message || "Erro desconhecido"}`)
      }

    } catch (e) {
      console.error("Error generating QR:", e)
      toast.error("Falha ao gerar QR Code (Exceção)")
    } finally {
      setIsCreating(false)
    }
  }

  // Registra/reregistra o webhook na instância já existente
  const registerWebhook = async (token: string, url: string) => {
    try {
      // Tenta múltiplos endpoints comuns no UazAPI
      const endpoints = [
        { path: '/webhook/set', method: 'POST', body: { url, enabled: true, events: ['messages.upsert', 'message'] } },
        { path: '/webhook', method: 'POST', body: { url, enabled: true } },
        { path: '/instance/webhook', method: 'PUT', body: { webhookUrl: url, enabled: true } },
      ]

      for (const ep of endpoints) {
        try {
          const r = await fetch(`${UAZAPI_URL}${ep.path}`, {
            method: ep.method,
            headers: { 'Content-Type': 'application/json', 'token': token },
            body: JSON.stringify(ep.body),
          })
          if (r.ok) {
            console.log(`Webhook registrado com sucesso via ${ep.path}`)
            return
          }
        } catch { /* tenta próximo */ }
      }
      console.warn('Não foi possível registrar webhook via API direta. Usando URL configurada na criação.')
    } catch (e) {
      console.warn('registerWebhook error (non-critical):', e)
    }
  }

  const handleReconfigureWebhook = async () => {
    if (!instanceToken || !webhookToken) {
      toast.error("Sem token de instância ou webhook configurado")
      return
    }
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
    const url = `${appUrl}/api/webhook/${webhookToken}`
    await registerWebhook(instanceToken, url)
    toast.success("Tentativa de reconfiguração enviada! Verifique o console.")
  }

  // 4. Polling
  useEffect(() => {
    if (!instanceName || !instanceToken) return

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${UAZAPI_URL}/instance/status`, {
          method: "GET",
          headers: { "token": instanceToken }
        })

        if (res.status === 404 || res.status === 410 || res.status === 400 || res.status === 401) {
          console.log("Instância não encontrada ou inválida. Limpando...")
          await handleLocalDisconnect()
          return
        }

        const data = await res.json()
        
        const isConnectedApi = data?.connected === true || 
                               data?.status?.connected === true || 
                               data?.instance?.status === "connected" || 
                               data?.state === "open" || 
                               data?.state === "connected" ||
                               data?.instance?.state === "open";
                               
        const stateString = data?.state || data?.instance?.state || data?.instance?.status || "disconnected";

        if (isConnectedApi) {
          if (!isConnected) {
            setIsConnected(true)
            setConnectionStatus('open')
            setQrCodeBase64(null)
            await updateSupabaseStatus(instanceName, "connected")
            toast.success("WhatsApp Conectado!")
          }
        } else {
          if (isConnected) {
            console.log("Detectada desconexão. Estado:", stateString)
            setIsConnected(false)
            setConnectionStatus(stateString)
            setQrCodeBase64(null)

            await updateSupabaseStatus(instanceName, "disconnected")
            toast.warning("Conexão perdida. Reconecte.")
          }
        }
      } catch (e) {
        console.error("Polling error:", e)
      }
    }, 6000)

    return () => clearInterval(interval)
  }, [instanceName, instanceToken, isConnected])

  const handleLocalDisconnect = async () => {
    if (!instanceName) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from("whatsapp_connections")
          .delete()
          .eq("user_id", user.id)
          .eq("instance_name", instanceName)
      }
      setIsConnected(false)
      setInstanceName(null)
      setInstanceToken(null)
      setQrCodeBase64(null)
      setConnectionStatus("disconnected")
    } catch (err) {
      console.error("Erro ao limpar dados locais:", err)
    }
  }

  const updateSupabaseStatus = async (inst: string, status: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase
      .from("whatsapp_connections")
      .update({ status })
      .eq("user_id", user.id)
      .eq("instance_name", inst)
  }

  // 5. DELETE Instance
  const handleDisconnect = async () => {
    if (!instanceName || !instanceToken) return

    try {
      let delRes = await fetch(`${UAZAPI_URL}/instance`, {
        method: "DELETE",
        headers: { "token": instanceToken }
      })
      
      if (!delRes.ok) {
        await fetch(`${UAZAPI_URL}/instance/delete/${instanceName}`, {
          method: "DELETE",
          headers: { "admintoken": UAZAPI_ADMIN_TOKEN as string }
        })
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from("whatsapp_connections")
          .delete()
          .eq("user_id", user.id)
          .eq("instance_name", instanceName)
      }

      setIsConnected(false)
      setInstanceName(null)
      setInstanceToken(null)
      setQrCodeBase64(null)
      setConnectionStatus("disconnected")
      toast.success("Instância desconectada")

    } catch (e) {
      console.error("Disconnect Error:", e)
      toast.error("Erro ao desconectar")
    }
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-balance text-3xl font-bold tracking-tight">Conexões</h1>
        <p className="text-muted-foreground">Conecte seu WhatsApp ao nosso Agente IA.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* WhatsApp Connection Card */}
        <Card className="md:col-span-2 lg:col-span-1 border-primary/20 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Conexão WhatsApp
              {isConnected ? (
                <div className="flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-500">
                  <CheckCircle2 className="h-4 w-4" />
                  Conectado
                </div>
              ) : (
                <div className="flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-500">
                  <XCircle className="h-4 w-4" />
                  Desconectado
                </div>
              )}
            </CardTitle>
            <CardDescription>Gerencie sua conexão para disparos automáticos</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-6">
            {!isConnected ? (
              <>
                {qrCodeBase64 ? (
                  <div className="relative flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-500">
                    <div className="flex aspect-square w-64 items-center justify-center rounded-lg border-2 border-dashed border-primary/30 bg-muted/30 p-2 relative overflow-hidden">
                      {/* Scan Line Animation */}
                      <div className="absolute top-0 w-full h-1 bg-primary/50 shadow-[0_0_15px_rgba(59,130,246,0.5)] animate-[scan_2s_ease-in-out_infinite]" />
                      <img src={qrCodeBase64} alt="QR Code WhatsApp" className="w-full h-full object-contain rounded-md" />
                    </div>
                    <div className="space-y-2 text-center max-w-xs">
                      <p className="text-sm font-medium animate-pulse text-primary">Aguardando leitura...</p>
                      <p className="text-xs text-muted-foreground">
                        Abra o WhatsApp {">"} Aparelhos conectados {">"} Conectar um aparelho
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setQrCodeBase64(null)} className="text-muted-foreground">
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex h-64 w-64 items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30">
                      <QrCode className="h-32 w-32 text-muted-foreground/50" />
                    </div>
                    <div className="space-y-2 text-center">
                      <p className="text-sm font-medium">Nenhuma conexão ativa</p>
                      <p className="text-xs text-muted-foreground">
                        Gere um novo QR Code para autenticar
                      </p>
                    </div>
                    <Button className="w-full gap-2" onClick={handleGenerateQRCode} disabled={isCreating}>
                      {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      {isCreating ? "Gerando Instância..." : "Gerar Novo QR Code"}
                    </Button>
                  </>
                )}
              </>
            ) : (
              // CONNECTED STATE
              <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex flex-col items-center justify-center py-6 rounded-xl border border-green-500/20 bg-green-500/5">
                  <div className="relative">
                    <div className="absolute inset-0 bg-green-500 blur-xl opacity-20 rounded-full animate-pulse" />
                    <CheckCircle2 className="h-16 w-16 text-green-500 relative z-10" />
                  </div>
                  <p className="mt-4 text-lg font-semibold text-green-400">Sistema Operante</p>
                  <p className="text-xs text-green-500/70 uppercase tracking-widest mt-1">Conectado a Legado</p>
                </div>

                <div className="w-full space-y-3">
                  <div className="flex justify-between items-center rounded-lg border border-border p-3 bg-muted/20">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <Smartphone className="h-4 w-4" /> Identificador
                    </span>
                    <span className="text-sm font-medium font-mono">{instanceName}</span>
                  </div>
                  <div className="flex justify-between items-center rounded-lg border border-border p-3 bg-muted/20">
                    <span className="text-sm text-muted-foreground">Status da API</span>
                    <span className="text-xs font-bold px-2 py-1 rounded bg-green-500/20 text-green-400 uppercase">ONLINE</span>
                  </div>
                </div>

                <Button variant="destructive" className="w-full gap-2 border-red-900/50 hover:bg-red-900/20 hover:text-red-400" onClick={handleDisconnect}>
                  <Trash2 className="h-4 w-4" />
                  Desconectar WhatsApp
                </Button>

                <Button
                  variant="outline"
                  className="w-full gap-2 border-white/10 text-gray-400 hover:text-white hover:bg-white/5"
                  onClick={handleReconfigureWebhook}
                >
                  <RefreshCcw className="h-4 w-4" />
                  Reconfigurar Webhook
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructions Card */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Como Conectar</CardTitle>
            <CardDescription>Siga os passos abaixo para conectar sua conta</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                1
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Abra o WhatsApp</p>
                <p className="text-xs text-muted-foreground">No seu celular, abra o aplicativo do WhatsApp Business ou Pessoal.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                2
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Menu de Aparelhos</p>
                <p className="text-xs text-muted-foreground">Toque nos 3 pontos (Android) ou Configurações (iOS) e selecione "Dispositivos conectados".</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                3
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Escaneie o QR Code</p>
                <p className="text-xs text-muted-foreground">Clique em "Conectar um aparelho" e aponte a câmera para a tela ao lado.</p>
              </div>
            </div>

            <div className="rounded-lg bg-yellow-500/10 p-3 mt-4 border border-yellow-500/20">
              <p className="text-xs text-yellow-500 flex items-start gap-2">
                <span className="font-bold">Importante:</span>
                Mantenha seu celular conectado à internet para garantir que o dispositivo será conectado corretamente.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Webhook Configuration Card */}
      <Card className="border-indigo-500/20 bg-indigo-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5 text-indigo-500" />
            Webhook Inteligente
          </CardTitle>
          <CardDescription>
            Receba leads automaticamente de diversas fontes. O sistema identifica e padroniza os dados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 border-blue-200/20">
              <CheckCircle2 className="mr-1 h-3 w-3" /> Extração Google Maps
            </Badge>
            <Badge variant="secondary" className="bg-pink-500/10 text-pink-500 border-pink-200/20">
              <CheckCircle2 className="mr-1 h-3 w-3" /> Instagrapi / Instagram
            </Badge>
            <Badge variant="secondary" className="bg-green-500/10 text-green-500 border-green-200/20">
              <CheckCircle2 className="mr-1 h-3 w-3" /> Receita WS / CNPJ
            </Badge>
          </div>

          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium">Sua URL de Webhook</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  readOnly
                  value={webhookToken ? `${process.env.NEXT_PUBLIC_APP_URL || "https://app.prospektia.com"}/api/webhook/${webhookToken}` : "Gere um token para obter a URL"}
                  className="bg-background pr-24 font-mono text-sm"
                />
              </div>
              <Button onClick={handleCopyWebhookUrl} disabled={!webhookToken} variant="outline" className="shrink-0 gap-2">
                <Copy className="h-4 w-4" /> Copiar
              </Button>
            </div>
            {!webhookToken && (
              <Button onClick={handleGenerateWebhookToken} disabled={webhookLoading} className="w-fit gap-2">
                <RefreshCcw className={`h-4 w-4 ${webhookLoading ? 'animate-spin' : ''}`} />
                Gerar Token de Acesso
              </Button>
            )}
            {webhookToken && (
              <div className="text-xs text-muted-foreground flex items-center justify-between">
                <span>Token ativo e seguro.</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-red-400 hover:text-red-500 hover:bg-transparent"
                  onClick={handleGenerateWebhookToken}
                  disabled={webhookLoading}
                >
                  Regerar Token (Revoga o anterior)
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <style jsx>{`
        @keyframes scan {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
      `}</style>
    </div >
  )
}
