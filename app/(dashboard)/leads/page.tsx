import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Filter, Download, UserPlus } from "lucide-react"

export default function LeadsPage() {
  const leads = [
    { id: 1, name: "João Silva", empresa: "Tech Solutions", status: "Novo", origem: "Maps" },
    { id: 2, name: "Maria Santos", empresa: "Digital Marketing", status: "Contato", origem: "Instagram" },
    { id: 3, name: "Pedro Costa", empresa: "Consultoria Ltda", status: "Qualificado", origem: "CNPJ" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Leads</h1>
          <p className="mt-1 text-muted-foreground">Gerencie todos os seus leads capturados</p>
        </div>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Adicionar Lead
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Lista de Leads</CardTitle>
              <CardDescription>Total de {leads.length} leads capturados</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                Filtrar
              </Button>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Exportar
              </Button>
            </div>
          </div>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar leads..." className="pl-9" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {leads.map((lead) => (
              <div
                key={lead.id}
                className="flex items-center justify-between rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent"
              >
                <div className="space-y-1">
                  <h3 className="font-semibold">{lead.name}</h3>
                  <p className="text-sm text-muted-foreground">{lead.empresa}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    {lead.origem}
                  </span>
                  <span className="rounded-full bg-accent px-3 py-1 text-xs font-medium">{lead.status}</span>
                  <Button variant="outline" size="sm">
                    Ver Detalhes
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
