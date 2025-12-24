import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { MessageSquare, Clock, Zap } from "lucide-react"

export default function AgenteAtendimentoPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Agente de Atendimento</h1>
        <p className="mt-1 text-muted-foreground">
          Configure o comportamento da IA para atender e nutrir leads automaticamente
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Personalidade do Agente</CardTitle>
            <CardDescription>Defina o tom e estilo de comunicação da IA</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="personality">Instruções de Personalidade</Label>
              <Textarea
                id="personality"
                placeholder="Ex: Seja amigável, profissional e prestativo. Use uma linguagem clara e objetiva..."
                className="min-h-[200px] resize-none"
                defaultValue="Você é um assistente virtual profissional e cordial. Responda de forma clara, objetiva e sempre buscando ajudar o cliente. Seja empático e demonstre interesse genuíno nas necessidades do lead."
              />
            </div>
            <Button className="w-full">Salvar Personalidade</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Respostas Automáticas</CardTitle>
            <CardDescription>Configure quando o agente deve responder</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Primeira mensagem</p>
                  <p className="text-sm text-muted-foreground">Resposta automática inicial</p>
                </div>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Fora do horário</p>
                  <p className="text-sm text-muted-foreground">Responder após expediente</p>
                </div>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Follow-up automático</p>
                  <p className="text-sm text-muted-foreground">Acompanhamento de leads</p>
                </div>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Horário de Atendimento</CardTitle>
          <CardDescription>Defina quando o agente deve estar ativo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="start-time">Horário de Início</Label>
              <Input id="start-time" type="time" defaultValue="09:00" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-time">Horário de Término</Label>
              <Input id="end-time" type="time" defaultValue="18:00" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Atendimento 24/7</p>
              <p className="text-sm text-muted-foreground">Manter agente ativo o tempo todo</p>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transferência para Humano</CardTitle>
          <CardDescription>Configure quando transferir para atendimento humano</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Solicitação explícita</p>
              <p className="text-sm text-muted-foreground">Quando o cliente pedir para falar com humano</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Alta intenção de compra</p>
              <p className="text-sm text-muted-foreground">Lead demonstra forte interesse em fechar negócio</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Reclamações</p>
              <p className="text-sm text-muted-foreground">Cliente expressa insatisfação ou problemas</p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
