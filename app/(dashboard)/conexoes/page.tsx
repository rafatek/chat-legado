"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { QrCode, CheckCircle2, XCircle, RefreshCw, Smartphone, Loader2, Trash2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner" // Assuming sonner is installed/used for toasts, or we can fallback to alert/console

// Env vars
const EVO_URL = process.env.NEXT_PUBLIC_EVO_URL
const EVO_API_KEY = process.env.NEXT_PUBLIC_EVO_API_KEY

export default function ConexoesPage() {
  const [loading, setLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)

  // Instance State
  const [instanceName, setInstanceName] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<string>("disconnected") // connecting, open, close
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null)

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
          if (connection.status === "connected") {
            setIsConnected(true)
            setConnectionStatus("open")
          } else {
            // If exists but not connected, maybe we need to fetch QR or check state
            setInstanceName(connection.instance_name)
            checkEvolutionState(connection.instance_name)
          }
        }
      } catch (err) {
        console.error("Error checking connection:", err)
      } finally {
        setLoading(false)
      }
    }

    checkConnection()
  }, [])

  // Helper to check state directly from Evo
  const checkEvolutionState = async (instName: string) => {
    try {
      const res = await fetch(`${EVO_URL}/instance/connectionState/${instName}`, {
        headers: {
          "apikey": EVO_API_KEY as string
        }
      })
      const data = await res.json()
      // Expected: { instance: { state: 'open' | 'close' | 'connecting' } }
      const state = data?.instance?.state || "close"

      if (state === "open") {
        setIsConnected(true)
        setConnectionStatus("open")
        // Update Supabase if needed
        await updateSupabaseStatus(instName, "connected")
      } else {
        setIsConnected(false)
        setConnectionStatus(state)
        if (state === "close" || state === "connecting") {
          // Try to get QR Code again if it's not open
          fetchQrCode(instName)
        }
      }
    } catch (e) {
      console.error("Error checking Evo state:", e)
    }
  }

  // 2. Fetch QR Code
  const fetchQrCode = async (instName: string) => {
    try {
      const res = await fetch(`${EVO_URL}/instance/connect/${instName}`, {
        headers: {
          "apikey": EVO_API_KEY as string
        }
      })
      const data = await res.json()
      // Expected: { base64: "..." } or { code: ..., base64: "..." }
      if (data.base64) {
        setQrCodeBase64(data.base64)
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
      // 1. Check for existing connection in Supabase
      const { data: existingConn } = await supabase
        .from("whatsapp_connections")
        .select("instance_name")
        .eq("user_id", user.id)
        .single()

      if (existingConn && existingConn.instance_name) {
        console.log(`Encontrada instância antiga: ${existingConn.instance_name}. Iniciando limpeza...`)

        try {
          // 2. Delete from Evolution API
          const delRes = await fetch(`${EVO_URL}/instance/delete/${existingConn.instance_name}`, {
            method: "DELETE",
            headers: { "apikey": EVO_API_KEY as string }
          })

          if (delRes.ok) {
            console.log("Instância antiga deletada na API com sucesso.")
          } else if (delRes.status === 404 || delRes.status === 400) {
            console.log("Instância antiga não existia mais na API (404/400). Ignorando...")
          } else {
            console.warn("Falha ao deletar instância antiga na API:", await delRes.text())
          }
        } catch (delErr) {
          console.error("Erro ao tentar deletar instância antiga:", delErr)
        }

        // 3. Delete from Supabase (Clean Start)
        await supabase
          .from("whatsapp_connections")
          .delete()
          .eq("user_id", user.id)
      }
      // --- ZOMBIE CLEANUP END ---

      // Short and professional name logic: PRP-{5_CHARS_ID}-{3_RANDOM}
      const shortId = user.id.slice(0, 5)
      const randomSuffix = Math.random().toString(36).substring(2, 5)
      const newInstanceName = `PRP-${shortId}-${randomSuffix}`

      console.log('Enviando para:', `${EVO_URL}/instance/create`, 'com chave:', EVO_API_KEY)

      // Payload Exact Match
      const payload = {
        "instanceName": newInstanceName,
        "qrcode": true,
        "integration": "WHATSAPP-BAILEYS"
      }

      console.log('Payload Body:', payload)

      // Call Evolution Create
      const res = await fetch(`${EVO_URL}/instance/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": EVO_API_KEY as string
        },
        body: JSON.stringify(payload)
      })

      let data;
      const isSuccess = res.ok;

      try {
        data = await res.json();
      } catch (err) {
        console.error("Erro ao fazer parse do JSON response", err);
        data = null;
      }

      console.log("Create Response Status:", res.status);
      console.log("Create Response Body:", data);

      // Check if success OR if error is "already exists"
      const isAlreadyExists =
        !res.ok &&
        data &&
        (
          (data.error && typeof data.error === 'string' && data.error.includes("already exists")) ||
          (data.message && typeof data.message === 'string' && data.message.includes("already exists")) ||
          res.status === 403
        );

      if (isSuccess || isAlreadyExists) {
        console.log("Sucesso ou Já Existe. Prosseguindo...");

        // Save to Supabase
        const { error: dbError } = await supabase.from("whatsapp_connections").upsert({
          user_id: user.id,
          instance_name: newInstanceName,
          instance_key: (data && data.hash && data.hash.apikey) || EVO_API_KEY,
          status: "connecting",
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' })

        if (dbError) {
          console.error('Erro Detalhado Supabase:', dbError.message, dbError.details, dbError.hint)
          throw dbError
        }

        console.log('✅ Dados salvos no Supabase com sucesso!')

        setInstanceName(newInstanceName)

        // QR Code Handling
        if (data && data.qrcode && data.qrcode.base64) {
          setQrCodeBase64(data.qrcode.base64)
        } else {
          setTimeout(() => fetchQrCode(newInstanceName), 1000)
        }

      } else {
        console.error('Falha na criação:', data)
        const errorMessage = data?.message || (data?.error ? JSON.stringify(data.error) : "Erro desconhecido")
        toast.error(`Erro ao criar: ${errorMessage}`)
      }

    } catch (e) {
      console.error("Error generating QR:", e)
      toast.error("Falha ao gerar QR Code (Exceção)")
    } finally {
      setIsCreating(false)
    }
  }

  // 4. Polling
  useEffect(() => {
    if (!instanceName) return

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${EVO_URL}/instance/connectionState/${instanceName}`, {
          headers: { "apikey": EVO_API_KEY as string }
        })

        // Handle Instance Gone (404/410)
        if (res.status === 404 || res.status === 410 || res.status === 400) {
          console.log("Instância não encontrada ou inválida. Limpando...")
          await handleLocalDisconnect()
          return
        }

        const data = await res.json()
        const state = data?.instance?.state

        if (state === 'open') {
          if (!isConnected) {
            setIsConnected(true)
            setConnectionStatus('open')
            setQrCodeBase64(null)
            await updateSupabaseStatus(instanceName, "connected")
            toast.success("WhatsApp Conectado!")
          }
        } else {
          // Any other state (close, connecting, refuses, etc)
          if (isConnected) {
            console.log("Detectada desconexão. Estado:", state)
            setIsConnected(false)
            setConnectionStatus(state || 'disconnected')
            setQrCodeBase64(null) // Ensures "Generate QR" button appears

            await updateSupabaseStatus(instanceName, "disconnected")
            toast.warning("Conexão perdida. Reconecte.")
          }
        }
      } catch (e) {
        console.error("Polling error:", e)
      }
    }, 6000)

    return () => clearInterval(interval)
  }, [instanceName, isConnected])

  const handleLocalDisconnect = async () => {
    // Just cleans up local state and DB row, assumes remote is already gone
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
    if (!instanceName) return

    try {
      // Evo Delete
      await fetch(`${EVO_URL}/instance/delete/${instanceName}`, {
        method: "DELETE",
        headers: { "apikey": EVO_API_KEY as string }
      })

      // Supabase Delete
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from("whatsapp_connections")
          .delete()
          .eq("user_id", user.id)
          .eq("instance_name", instanceName)
      }

      // Reset State
      setIsConnected(false)
      setInstanceName(null)
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
                  <p className="text-xs text-green-500/70 uppercase tracking-widest mt-1">Conectado ao ProspektIA</p>
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
                <span className="font-bold">⚠️ Importante:</span>
                Mantenha seu celular conectado à internet para garantir que o dispositivo será conectado corretamente.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <style jsx>{`
        @keyframes scan {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
      `}</style>
    </div>
  )
}
