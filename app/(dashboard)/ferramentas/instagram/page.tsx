import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Instagram, Search } from "lucide-react"

export default function ExtratorInstagramPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Extrator de Instagram</h1>
        <p className="mt-1 text-muted-foreground">Extraia perfis comerciais e dados de contato do Instagram</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configurar Busca</CardTitle>
          <CardDescription>Defina os parâmetros para extrair perfis do Instagram</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="hashtag">Hashtag ou Palavra-chave</Label>
            <Input id="hashtag" placeholder="Ex: #empreendedorismo, #tecnologia..." />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="min-followers">Mínimo de Seguidores</Label>
              <Input id="min-followers" type="number" placeholder="1000" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-results">Máximo de Resultados</Label>
              <Input id="max-results" type="number" placeholder="50" defaultValue="50" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-type">Tipo de Perfil</Label>
            <select
              id="profile-type"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="all">Todos</option>
              <option value="business">Apenas Comerciais</option>
              <option value="creator">Apenas Criadores</option>
            </select>
          </div>

          <Button className="w-full">
            <Search className="mr-2 h-4 w-4" />
            Iniciar Extração
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resultados da Extração</CardTitle>
          <CardDescription>Últimos perfis extraídos do Instagram</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed border-border p-12 text-center">
            <Instagram className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Nenhuma extração realizada</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Configure os parâmetros acima e inicie uma extração para ver os resultados aqui
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
