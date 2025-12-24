"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { QrCode, CheckCircle2, XCircle, RefreshCw } from "lucide-react"

export default function ConexoesPage() {
  const [isConnected, setIsConnected] = useState(false)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-balance text-3xl font-bold tracking-tight">Conexões</h1>
        <p className="text-muted-foreground">Conecte suas instâncias do WhatsApp</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* WhatsApp Connection Card */}
        <Card className="md:col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              WhatsApp Business
              {isConnected ? (
                <CheckCircle2 className="h-5 w-5 text-primary" />
              ) : (
                <XCircle className="h-5 w-5 text-muted-foreground" />
              )}
            </CardTitle>
            <CardDescription>Conecte sua conta do WhatsApp para começar a enviar mensagens</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-6">
            {!isConnected ? (
              <>
                <div className="flex h-64 w-64 items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30">
                  <QrCode className="h-32 w-32 text-muted-foreground" />
                </div>
                <div className="space-y-2 text-center">
                  <p className="text-sm font-medium">Escaneie o QR Code com seu WhatsApp</p>
                  <p className="text-xs text-muted-foreground">
                    Abra o WhatsApp no seu celular e vá em Dispositivos vinculados
                  </p>
                </div>
                <Button className="w-full">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Gerar Novo QR Code
                </Button>
              </>
            ) : (
              <>
                <div className="flex h-64 w-64 flex-col items-center justify-center rounded-lg border border-border bg-primary/5">
                  <CheckCircle2 className="h-16 w-16 text-primary" />
                  <p className="mt-4 text-lg font-semibold">Conectado!</p>
                </div>
                <div className="w-full space-y-2">
                  <div className="flex justify-between rounded-lg border border-border p-3">
                    <span className="text-sm text-muted-foreground">Número</span>
                    <span className="text-sm font-medium">+55 11 98765-4321</span>
                  </div>
                  <div className="flex justify-between rounded-lg border border-border p-3">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <span className="text-sm font-medium text-primary">Ativo</span>
                  </div>
                </div>
                <Button variant="outline" className="w-full bg-transparent">
                  Desconectar
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Instructions Card */}
        <Card>
          <CardHeader>
            <CardTitle>Como Conectar</CardTitle>
            <CardDescription>Siga os passos abaixo para conectar sua conta</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                1
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Abra o WhatsApp</p>
                <p className="text-xs text-muted-foreground">No seu celular, abra o aplicativo do WhatsApp</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                2
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Acesse Dispositivos</p>
                <p className="text-xs text-muted-foreground">Vá em Menu {">"} Dispositivos vinculados</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                3
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Escaneie o QR Code</p>
                <p className="text-xs text-muted-foreground">Aponte a câmera para o QR Code mostrado na tela</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                4
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Pronto!</p>
                <p className="text-xs text-muted-foreground">Sua conta foi conectada com sucesso</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
