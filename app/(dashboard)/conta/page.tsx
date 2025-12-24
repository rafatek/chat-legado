import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Upload, CreditCard } from "lucide-react"

export default function ContaPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-balance text-3xl font-bold tracking-tight">Minha Conta</h1>
        <p className="text-muted-foreground">Gerencie suas informações e configurações</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Settings */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Informações Pessoais</CardTitle>
            <CardDescription>Atualize seus dados de perfil</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src="/placeholder.svg?height=80&width=80" />
                <AvatarFallback className="bg-primary text-primary-foreground text-lg">JD</AvatarFallback>
              </Avatar>
              <Button variant="outline" size="sm">
                <Upload className="mr-2 h-4 w-4" />
                Alterar Foto
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input id="name" defaultValue="João da Silva" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" defaultValue="joao@empresa.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input id="phone" defaultValue="+55 11 98765-4321" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Empresa</Label>
                <Input id="company" defaultValue="Minha Empresa Ltda" />
              </div>
            </div>

            <Button>Salvar Alterações</Button>
          </CardContent>
        </Card>

        {/* Plan Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Plano Atual</CardTitle>
              <CardDescription>Informações da sua assinatura</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Plano</span>
                  <Badge className="bg-primary">Pro</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Valor</span>
                  <span className="text-sm font-medium">R$ 297/mês</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Leads</span>
                  <span className="text-sm font-medium">500/mês</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Renovação</span>
                  <span className="text-sm font-medium">15/02/2025</span>
                </div>
              </div>
              <Button variant="outline" className="w-full bg-transparent">
                <CreditCard className="mr-2 h-4 w-4" />
                Gerenciar Plano
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Uso Atual</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Leads</span>
                  <span className="font-medium">284 / 500</span>
                </div>
                <div className="h-2 rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-primary" style={{ width: "56.8%" }} />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Mensagens</span>
                  <span className="font-medium">1,421 / 2,000</span>
                </div>
                <div className="h-2 rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-accent" style={{ width: "71%" }} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
