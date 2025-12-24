import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, Clock, CheckCircle, XCircle, Instagram, MapPin, FileText, Plus } from "lucide-react"

const leadsData = {
  "Novos Leads": [
    { id: 1, name: "Restaurante Bella Vista", source: "maps", value: 5000, priority: "high" },
    { id: 2, name: "Academia FitZone", source: "instagram", value: 3500, priority: "medium" },
    { id: 3, name: "Advocacia Silva & Costa", source: "cnpj", value: 8000, priority: "high" },
    { id: 4, name: "Pet Shop Amigo Fiel", source: "maps", value: 2000, priority: "low" },
  ],
  "Contato Inicial": [
    { id: 5, name: "Clínica Dr. Santos", source: "instagram", value: 6000, priority: "high" },
    { id: 6, name: "Loja de Roupas Estilo", source: "maps", value: 4000, priority: "medium" },
    { id: 7, name: "Escritório Contábil Plus", source: "cnpj", value: 7500, priority: "high" },
  ],
  Qualificação: [
    { id: 8, name: "Padaria Pão Quente", source: "maps", value: 3000, priority: "medium" },
    { id: 9, name: "Consultoria Tech Pro", source: "instagram", value: 12000, priority: "high" },
  ],
  Proposta: [
    { id: 10, name: "Hotel Vista Mar", source: "cnpj", value: 15000, priority: "high" },
    { id: 11, name: "Salão de Beleza Glamour", source: "instagram", value: 4500, priority: "medium" },
  ],
  Fechado: [{ id: 12, name: "Imobiliária Prime", source: "maps", value: 10000, priority: "high" }],
}

function SourceIcon({ source }: { source: string }) {
  const icons = {
    maps: <MapPin className="h-3 w-3" />,
    instagram: <Instagram className="h-3 w-3" />,
    cnpj: <FileText className="h-3 w-3" />,
  }

  const colors = {
    maps: "bg-red-500/10 text-red-500",
    instagram: "bg-pink-500/10 text-pink-500",
    cnpj: "bg-blue-500/10 text-blue-500",
  }

  return (
    <div className={`inline-flex items-center justify-center rounded-md p-1 ${colors[source as keyof typeof colors]}`}>
      {icons[source as keyof typeof icons]}
    </div>
  )
}

function PriorityBadge({ priority }: { priority: string }) {
  const variants = {
    high: "bg-red-500/10 text-red-500 border-red-500/20",
    medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    low: "bg-green-500/10 text-green-500 border-green-500/20",
  }

  return (
    <Badge variant="outline" className={`${variants[priority as keyof typeof variants]} text-xs`}>
      {priority === "high" ? "Alta" : priority === "medium" ? "Média" : "Baixa"}
    </Badge>
  )
}

export default function CRMPage() {
  const pipeline = [
    { stage: "Novos Leads", count: 4, color: "bg-blue-500", borderColor: "border-t-blue-500" },
    { stage: "Contato Inicial", count: 3, color: "bg-yellow-500", borderColor: "border-t-yellow-500" },
    { stage: "Qualificação", count: 2, color: "bg-purple-500", borderColor: "border-t-purple-500" },
    { stage: "Proposta", count: 2, color: "bg-orange-500", borderColor: "border-t-orange-500" },
    { stage: "Fechado", count: 1, color: "bg-green-500", borderColor: "border-t-green-500" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">CRM</h1>
        <p className="mt-1 text-muted-foreground">Gerencie seu pipeline de vendas e acompanhe oportunidades</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">30</div>
            <p className="text-xs text-muted-foreground">no pipeline</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">16</div>
            <p className="text-xs text-muted-foreground">necessitam atenção</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Fechados</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">neste mês</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ 80.5K</div>
            <p className="text-xs text-muted-foreground">em negociação</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pipeline de Vendas - Kanban</CardTitle>
          <CardDescription>Arraste e organize suas oportunidades por estágio</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-4 min-w-max">
              {pipeline.map((stage) => (
                <div key={stage.stage} className="flex-shrink-0 w-[280px] space-y-3">
                  <div className={`rounded-lg border-t-4 ${stage.borderColor} bg-card p-3`}>
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm">{stage.stage}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {stage.count}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-3 min-h-[200px]">
                    {leadsData[stage.stage as keyof typeof leadsData]?.map((lead) => (
                      <div
                        key={lead.id}
                        className="group rounded-lg border border-border bg-card p-4 hover:shadow-lg hover:border-primary/50 transition-all cursor-grab active:cursor-grabbing hover:scale-[1.02]"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <SourceIcon source={lead.source} />
                          <PriorityBadge priority={lead.priority} />
                        </div>

                        <h4 className="font-medium text-sm mb-2 line-clamp-2">{lead.name}</h4>

                        <div className="flex items-center justify-between">
                          <p className="text-lg font-bold text-primary">R$ {(lead.value / 1000).toFixed(1)}K</p>
                          <span className="text-xs text-muted-foreground">
                            {lead.source === "maps" ? "Maps" : lead.source === "instagram" ? "Instagram" : "CNPJ"}
                          </span>
                        </div>
                      </div>
                    ))}

                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full border-2 border-dashed border-border hover:border-primary/50 transition-colors"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Lead
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
