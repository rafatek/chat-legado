import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { MapPin, Instagram, FileText } from "lucide-react"

export default function AgenteProspeccaoPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Agente de Prospecção</h1>
        <p className="mt-1 text-muted-foreground">
          Configure o comportamento da IA para buscar e qualificar leads automaticamente
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Instruções do Agente</CardTitle>
            <CardDescription>Defina como o agente deve se comportar ao buscar e interagir com leads</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="instructions">Instruções para a IA</Label>
              <Textarea
                id="instructions"
                placeholder="Ex: Busque empresas de tecnologia na região de São Paulo com mais de 10 funcionários. Priorize empresas que possuem site próprio..."
                className="min-h-[200px] resize-none"
                defaultValue="Você é um agente de prospecção especializado em encontrar leads qualificados. Busque empresas que atendam aos critérios definidos e colete informações de contato relevantes."
              />
            </div>
            <Button className="w-full">Salvar Instruções</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fontes de Busca</CardTitle>
            <CardDescription>Selecione onde o agente deve buscar leads</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Google Maps</p>
                  <p className="text-sm text-muted-foreground">Buscar empresas locais</p>
                </div>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Instagram className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Instagram</p>
                  <p className="text-sm text-muted-foreground">Extrair perfis comerciais</p>
                </div>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">CNPJ</p>
                  <p className="text-sm text-muted-foreground">Consultar base de CNPJs</p>
                </div>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configurações Avançadas</CardTitle>
          <CardDescription>Ajuste fino do comportamento do agente</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Auto-qualificação de leads</p>
              <p className="text-sm text-muted-foreground">IA avalia automaticamente a qualidade dos leads</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Enriquecimento de dados</p>
              <p className="text-sm text-muted-foreground">Buscar informações adicionais sobre os leads</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Notificações em tempo real</p>
              <p className="text-sm text-muted-foreground">Receba alertas quando novos leads forem encontrados</p>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
