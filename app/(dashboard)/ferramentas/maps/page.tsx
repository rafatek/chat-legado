"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Play, Download, Copy, Check, MapPin } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

export default function ExtratorMapsPage() {
  const [userEmail, setUserEmail] = useState("")
  const [isCopied, setIsCopied] = useState(false)
  const [isTutorialOpen, setIsTutorialOpen] = useState(false)

  const downloadUrl = process.env.NEXT_PUBLIC_MAPS_EXTENSION_URL || "#"

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        setUserEmail(user.email)
      }
    }
    getUser()
  }, [])

  const handleCopyEmail = () => {
    if (!userEmail) return
    navigator.clipboard.writeText(userEmail)
    setIsCopied(true)
    toast.success("E-mail copiado para a área de transferência!")
    setTimeout(() => setIsCopied(false), 2000)
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Extrator Google Maps
          </h1>
          <p className="mt-1 text-muted-foreground">
            Central de Download e Licença da Extensão Oficial
          </p>
        </div>

        <Dialog open={isTutorialOpen} onOpenChange={setIsTutorialOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="border-primary/20 hover:bg-primary/10 hover:text-primary transition-all">
              <Play className="mr-2 h-4 w-4" />
              Ver Tutorial
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[800px]">
            <DialogHeader>
              <DialogTitle>Tutorial: Extrator Google Maps</DialogTitle>
              <DialogDescription>
                Aprenda como instalar e utilizar a extensão para extrair leads qualificados.
              </DialogDescription>
            </DialogHeader>
            <div className="aspect-video w-full bg-black/50 rounded-lg flex items-center justify-center overflow-hidden border border-white/10">
              {/* Placeholder do iframe. Substituir pelo link real quando disponível */}
              <div className="text-center p-8">
                <Play className="h-12 w-12 mx-auto text-white/50 mb-4" />
                <p className="text-muted-foreground">Vídeo Tutorial em Breve</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Download Card */}
        <Card className="border-blue-500/20 bg-gradient-to-b from-blue-950/10 to-transparent relative overflow-hidden group hover:border-blue-500/40 transition-colors">
          <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <MapPin className="h-5 w-5 text-blue-400" />
              Instalar Extensão
            </CardTitle>
            <CardDescription>
              Siga os passos abaixo para começar a usar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 relative z-10">
            <div className="space-y-4 text-sm text-gray-300">
              <p>1. Clique no botão abaixo para baixar a extensão no Opera.</p>
              <p>2. Acesse <code>opera://extensions/</code> no seu navegador.</p>
              <p>3. Ative o "Modo Desenvolvedor" no canto superior direito.</p>
              <p>4. Assiata o vídeo para mais detalhes.</p>
            </div>

            <Button asChild className="w-full h-12 text-base font-semibold shadow-lg shadow-blue-500/20" size="lg">
              <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
                <Download className="mr-2 h-5 w-5" />
                Baixar Extensão do ProspektIA
              </a>
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Versão 2.0 • Atualizado em Jan/2026
            </p>
          </CardContent>
        </Card>

        {/* License Box */}
        <Card className="border-white/10">
          <CardHeader>
            <CardTitle className="text-xl">Sua Chave de Acesso</CardTitle>
            <CardDescription>
              Utilize esta licença para ativar a extensão após a instalação.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-200/80 text-sm">
              <strong>Importante:</strong> Use o seu e-mail de compra da Kiwify como chave de liberação. O acesso é permitido apenas para assinantes com status <strong>ativo</strong>.
            </div>

            <div className="space-y-2">
              <Label htmlFor="license-key">E-mail Licenciado</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="license-key"
                    value={userEmail || "Carregando..."}
                    readOnly
                    className="font-mono bg-secondary/50 pr-10"
                  />
                </div>
                <Button
                  variant="secondary"
                  onClick={handleCopyEmail}
                  disabled={!userEmail}
                  className="min-w-[120px]"
                >
                  {isCopied ? (
                    <>
                      <Check className="mr-2 h-4 w-4 text-green-500" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copiar
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Este e-mail é intransferível e monitorado.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
