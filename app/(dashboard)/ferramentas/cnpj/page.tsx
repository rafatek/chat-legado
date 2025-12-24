import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { FileText, Search, Upload } from "lucide-react"

export default function ExtratorCNPJPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Extrator de CNPJ</h1>
        <p className="mt-1 text-muted-foreground">Consulte e extraia dados de empresas pela base de CNPJs</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Consulta Individual</CardTitle>
            <CardDescription>Busque informações de um CNPJ específico</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input id="cnpj" placeholder="00.000.000/0000-00" />
            </div>
            <Button className="w-full">
              <Search className="mr-2 h-4 w-4" />
              Consultar CNPJ
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Consulta em Lote</CardTitle>
            <CardDescription>Importe uma lista de CNPJs para consultar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-dashed border-border p-8 text-center">
              <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">Arraste um arquivo CSV ou clique para selecionar</p>
              <Button variant="outline" className="mt-4 bg-transparent">
                Selecionar Arquivo
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros Avançados</CardTitle>
          <CardDescription>Refine sua busca por características específicas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="atividade">Atividade Principal</Label>
              <Input id="atividade" placeholder="Ex: Desenvolvimento de software" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="porte">Porte da Empresa</Label>
              <select
                id="porte"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Todos</option>
                <option value="mei">MEI</option>
                <option value="micro">Microempresa</option>
                <option value="pequeno">Pequeno Porte</option>
                <option value="medio">Médio Porte</option>
                <option value="grande">Grande Porte</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cidade">Cidade</Label>
              <Input id="cidade" placeholder="Ex: São Paulo" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="estado">Estado</Label>
              <select
                id="estado"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Selecione</option>
                <option value="SP">São Paulo</option>
                <option value="RJ">Rio de Janeiro</option>
                <option value="MG">Minas Gerais</option>
              </select>
            </div>
          </div>

          <Button className="w-full">
            <Search className="mr-2 h-4 w-4" />
            Buscar com Filtros
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resultados</CardTitle>
          <CardDescription>Dados extraídos das consultas realizadas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed border-border p-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Nenhuma consulta realizada</h3>
            <p className="mt-2 text-sm text-muted-foreground">Realize uma consulta para ver os resultados aqui</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
