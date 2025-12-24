import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { MapPin, Search } from "lucide-react"

export default function ExtratorMapsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Extrator do Maps</h1>
        <p className="mt-1 text-muted-foreground">Extraia dados de empresas do Google Maps de forma automatizada</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configurar Busca</CardTitle>
          <CardDescription>Defina os parâmetros para extrair empresas do Google Maps</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="keyword">Palavra-chave</Label>
              <Input id="keyword" placeholder="Ex: Restaurantes, Clínicas, Lojas..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Localização</Label>
              <Input id="location" placeholder="Ex: São Paulo, SP" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="radius">Raio (km)</Label>
              <Input id="radius" type="number" placeholder="5" defaultValue="5" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="limit">Limite de resultados</Label>
              <Input id="limit" type="number" placeholder="100" defaultValue="100" />
            </div>
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
          <CardDescription>Últimos dados extraídos do Google Maps</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed border-border p-12 text-center">
            <MapPin className="mx-auto h-12 w-12 text-muted-foreground" />
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
