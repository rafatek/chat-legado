"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Save, Sparkles } from "lucide-react"

export default function AgentePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-balance text-3xl font-bold tracking-tight">Configuração do Agente IA</h1>
        <p className="text-muted-foreground">Personalize o comportamento da IA de prospecção</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Configuration */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Instruções do Agente
            </CardTitle>
            <CardDescription>Defina como a IA deve se comportar durante a prospecção</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="instructions">Prompt do Agente</Label>
              <Textarea
                id="instructions"
                placeholder="Ex: Você é um agente de vendas especializado em abordagens consultivas. Seu objetivo é identificar necessidades do cliente e apresentar soluções personalizadas..."
                className="min-h-[200px] resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Seja específico sobre o tom, estilo e objetivos da comunicação
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tone">Tom de Voz</Label>
                <Select defaultValue="professional">
                  <SelectTrigger id="tone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Profissional</SelectItem>
                    <SelectItem value="friendly">Amigável</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="formal">Formal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="language">Idioma</Label>
                <Select defaultValue="pt-br">
                  <SelectTrigger id="language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pt-br">Português (BR)</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button className="w-full">
              <Save className="mr-2 h-4 w-4" />
              Salvar Configurações
            </Button>
          </CardContent>
        </Card>

        {/* Search Sources */}
        <Card>
          <CardHeader>
            <CardTitle>Fontes de Busca</CardTitle>
            <CardDescription>Selecione onde buscar leads</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <label className="flex items-center justify-between rounded-lg border border-border p-4 cursor-pointer hover:bg-accent/5 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <span className="text-lg">🗺️</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Google Maps</p>
                    <p className="text-xs text-muted-foreground">Empresas locais</p>
                  </div>
                </div>
                <input type="checkbox" defaultChecked className="h-4 w-4" />
              </label>

              <label className="flex items-center justify-between rounded-lg border border-border p-4 cursor-pointer hover:bg-accent/5 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                    <span className="text-lg">📸</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Instagram</p>
                    <p className="text-xs text-muted-foreground">Perfis e negócios</p>
                  </div>
                </div>
                <input type="checkbox" defaultChecked className="h-4 w-4" />
              </label>

              <label className="flex items-center justify-between rounded-lg border border-border p-4 cursor-pointer hover:bg-accent/5 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-3/10">
                    <span className="text-lg">🏢</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">CNPJ</p>
                    <p className="text-xs text-muted-foreground">Dados empresariais</p>
                  </div>
                </div>
                <input type="checkbox" className="h-4 w-4" />
              </label>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
