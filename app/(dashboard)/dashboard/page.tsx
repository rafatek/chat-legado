import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, MessageSquare, TrendingUp, Zap } from "lucide-react"

const metrics = [
  {
    title: "Total de Leads",
    value: "1,284",
    change: "+12.5%",
    icon: Users,
    trend: "up",
  },
  {
    title: "Mensagens Enviadas",
    value: "3,421",
    change: "+8.2%",
    icon: MessageSquare,
    trend: "up",
  },
  {
    title: "Taxa de Resposta",
    value: "24.8%",
    change: "+3.1%",
    icon: TrendingUp,
    trend: "up",
  },
  {
    title: "Buscas Ativas",
    value: "12",
    change: "3 hoje",
    icon: Zap,
    trend: "neutral",
  },
]

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-balance text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral das suas métricas de prospecção</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.title} className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{metric.title}</CardTitle>
              <metric.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <p className="text-xs text-primary">{metric.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Atividade Recente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-4 rounded-lg border border-border p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <MessageSquare className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Lead respondeu mensagem</p>
                    <p className="text-xs text-muted-foreground">Empresa ABC Ltda • Há 5 minutos</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Fontes de Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: "Google Maps", value: "45%", color: "bg-primary" },
                { name: "Instagram", value: "32%", color: "bg-accent" },
                { name: "CNPJ", value: "23%", color: "bg-chart-3" },
              ].map((source) => (
                <div key={source.name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{source.name}</span>
                    <span className="text-muted-foreground">{source.value}</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary">
                    <div className={`h-full rounded-full ${source.color}`} style={{ width: source.value }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
