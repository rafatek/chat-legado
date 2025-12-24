import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { MessageCircle, Mail, FileText, Sparkles } from "lucide-react"

export default function SuportePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-balance text-3xl font-bold tracking-tight">Suporte & Atualizações</h1>
        <p className="text-muted-foreground">Central de ajuda e novidades da plataforma</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Contact Form */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Entre em Contato</CardTitle>
            <CardDescription>Nossa equipe responde em até 24 horas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Assunto</Label>
              <Input id="subject" placeholder="Como podemos ajudar?" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Mensagem</Label>
              <Textarea
                id="message"
                placeholder="Descreva sua dúvida ou problema..."
                className="min-h-[150px] resize-none"
              />
            </div>
            <Button className="w-full">
              <Mail className="mr-2 h-4 w-4" />
              Enviar Mensagem
            </Button>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Acesso Rápido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start bg-transparent">
                <FileText className="mr-2 h-4 w-4" />
                Documentação
              </Button>
              <Button variant="outline" className="w-full justify-start bg-transparent">
                <MessageCircle className="mr-2 h-4 w-4" />
                Chat ao Vivo
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contato Direto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">E-mail</p>
                <p className="font-medium">suporte@prospektai.com</p>
              </div>
              <div>
                <p className="text-muted-foreground">WhatsApp</p>
                <p className="font-medium">+55 11 99999-9999</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Updates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Atualizações Recentes
          </CardTitle>
          <CardDescription>Confira as últimas melhorias da plataforma</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              {
                version: "v2.3.0",
                date: "15 Jan 2025",
                title: "Nova integração com Instagram Business",
                description: "Agora você pode prospectar diretamente de perfis comerciais do Instagram.",
              },
              {
                version: "v2.2.5",
                date: "08 Jan 2025",
                title: "Melhorias na IA de conversação",
                description: "O agente agora entende contextos mais complexos e responde de forma mais natural.",
              },
              {
                version: "v2.2.0",
                date: "02 Jan 2025",
                title: "Dashboard renovado",
                description: "Interface completamente redesenhada com foco em performance e usabilidade.",
              },
            ].map((update, i) => (
              <div key={i} className="flex gap-4 rounded-lg border border-border p-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{update.title}</span>
                    <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {update.version}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{update.description}</p>
                  <p className="text-xs text-muted-foreground">{update.date}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
