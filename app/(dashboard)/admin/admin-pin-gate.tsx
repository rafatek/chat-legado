"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Lock, Unlock, Loader2, ShieldAlert, KeyRound } from "lucide-react"

interface AdminPinGateProps {
  hasPin: boolean
  onUnlock: () => void
  onPinConfigured?: () => void
}

export function AdminPinGate({ hasPin, onUnlock, onPinConfigured }: AdminPinGateProps) {
  const [pin, setPin] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isConfiguring, setIsConfiguring] = useState(!hasPin)

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault()

    if (pin.length < 4) {
      toast.error("O PIN deve ter pelo menos 4 dígitos")
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch("/api/invoices/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        toast.success("Acesso ao faturamento liberado!")
        setPin("")
        onUnlock()
      } else {
        toast.error(data.error || "PIN incorreto")
        setPin("")
      }
    } catch (error) {
      console.error(error)
      toast.error("Erro ao validar PIN. Tente novamente.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSetupPin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (pin.length < 4) {
      toast.error("O PIN deve ter pelo menos 4 dígitos")
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch("/api/invoices/setup-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success("PIN de faturamento cadastrado com sucesso!")
        setPin("")
        if (onPinConfigured) {
          onPinConfigured()
        } else {
          onUnlock()
        }
      } else {
        toast.error(data.error || "Erro ao configurar PIN")
      }
    } catch (error) {
      console.error(error)
      toast.error("Erro ao configurar PIN")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-[460px] w-full items-center justify-center p-4 sm:p-8 animate-in fade-in zoom-in duration-300">
      <div className="relative max-w-md w-full">
        {/* Glow de fundo */}
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/30 via-purple-600/20 to-blue-600/30 rounded-2xl blur-xl opacity-70 pointer-events-none" />

        <Card className="relative border border-white/10 bg-[#0A0A12]/95 shadow-2xl backdrop-blur-xl overflow-hidden text-white">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

          <CardHeader className="text-center pb-3 pt-8">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.15)]">
              {isConfiguring ? (
                <KeyRound className="h-8 w-8 text-blue-400" />
              ) : (
                <Lock className="h-8 w-8 text-blue-400" />
              )}
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">
              {isConfiguring ? "Configurar PIN de Acesso" : "Faturamento Protegido"}
            </CardTitle>
            <CardDescription className="text-sm text-gray-400 mt-2 px-2">
              {isConfiguring
                ? "Defina um PIN de 4 dígitos para proteger as métricas financeiras e dados de faturamento contra acessos indevidos."
                : "Esta área contém métricas financeiras confidenciais. Insira seu PIN para visualizar."}
            </CardDescription>
          </CardHeader>

          <CardContent className="pb-8 pt-2">
            <form onSubmit={isConfiguring ? handleSetupPin : handleUnlock} className="space-y-5">
              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="••••"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  maxLength={8}
                  className="text-center text-3xl tracking-[0.3em] font-mono h-14 bg-black/60 border-white/15 focus-visible:ring-blue-500 focus-visible:border-blue-500 text-white placeholder:text-gray-600"
                  autoFocus
                />
                <p className="text-center text-[11px] text-gray-500">
                  {isConfiguring ? "Mínimo de 4 dígitos numéricos" : "Sessão válida por 15 minutos após desbloquear"}
                </p>
              </div>

              <Button
                type="submit"
                disabled={isLoading || pin.length < 4}
                className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white font-medium text-base shadow-lg shadow-blue-600/25 transition-all"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : isConfiguring ? (
                  <ShieldAlert className="h-5 w-5 mr-2" />
                ) : (
                  <Unlock className="h-5 w-5 mr-2" />
                )}
                {isConfiguring ? "Salvar PIN e Desbloquear" : "Desbloquear Faturamento"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
