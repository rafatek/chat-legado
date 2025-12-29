"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Lock, Zap, Loader2 } from "lucide-react"

// Rotas que são permitidas mesmo sem assinatura ativa
const ALLOWED_ROUTES = ["/conta", "/suporte", "/login"]

export function SubscriptionGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const pathname = usePathname()
    const [loading, setLoading] = useState(true)
    const [hasAccess, setHasAccess] = useState(false)
    const [checkoutUrl, setCheckoutUrl] = useState<string>("")

    useEffect(() => {
        async function checkSubscription() {
            try {
                const { data: { user } } = await supabase.auth.getUser()

                if (!user) {
                    router.replace("/login")
                    return
                }

                // Verifica status da assinatura e dados do perfil
                const { data: profile, error } = await supabase
                    .from("profiles")
                    .select("subscription_status, full_name")
                    .eq("id", user.id)
                    .single()

                if (error) {
                    console.error("Erro ao verificar assinatura:", error)
                    setHasAccess(false)
                } else {
                    // Prepara URL do checkout
                    if (user.email && profile?.full_name) {
                        // Verifica se a variável de ambiente está definida
                        const baseUrl = process.env.NEXT_PUBLIC_KIWIFY_CHECKOUT_URL

                        if (!baseUrl) {
                            console.warn("A variável de ambiente NEXT_PUBLIC_KIWIFY_CHECKOUT_URL não está definida.")
                        }

                        if (baseUrl) {
                            const params = new URLSearchParams({
                                email: user.email,
                                name: profile.full_name
                            })
                            setCheckoutUrl(`${baseUrl}?${params.toString()}`)
                        }
                    }

                    // Verifica se está ativo OU se está em uma rota permitida
                    const isActive = profile?.subscription_status === "active"
                    const isAllowedRoute = ALLOWED_ROUTES.some(route => pathname?.startsWith(route))

                    setHasAccess(isActive || isAllowedRoute)
                }
            } catch (error) {
                console.error("Erro inesperado:", error)
                setHasAccess(false)
            } finally {
                setLoading(false)
            }
        }

        checkSubscription()
    }, [pathname, router])

    if (loading) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!hasAccess) {
        return (
            <div className="flex h-full w-full flex-col items-center justify-center p-6 animate-in fade-in zoom-in duration-500">
                <div className="relative max-w-md w-full">
                    {/* Background Glow Effect */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl blur opacity-20 pointer-events-none" />

                    <Card className="relative border-red-500/20 shadow-2xl overflow-hidden backdrop-blur-sm bg-background/95">
                        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-red-500 to-orange-500" />

                        <CardHeader className="text-center pb-2">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
                                <Lock className="h-8 w-8 text-red-500" />
                            </div>
                            <CardTitle className="text-2xl font-bold tracking-tight">Assinatura Necessária</CardTitle>
                            <CardDescription className="text-base mt-2">
                                Seu acesso às ferramentas está temporariamente bloqueado.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-6 text-center">
                            <div className="rounded-lg bg-secondary/50 p-4 text-sm text-muted-foreground">
                                Para continuar utilizando nossos agentes de IA e ferramentas de extração, por favor, atualize ou renove sua assinatura.
                            </div>

                            <div className="grid gap-3">
                                <Button
                                    asChild
                                    size="lg"
                                    className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-medium shadow-lg hover:shadow-red-500/25 transition-all duration-300"
                                >
                                    <a href={checkoutUrl} target="_blank" rel="noopener noreferrer">
                                        <Zap className="mr-2 h-4 w-4" />
                                        Atualizar Assinatura
                                    </a>
                                </Button>

                                <Button
                                    variant="ghost"
                                    className="w-full text-muted-foreground hover:text-foreground"
                                    onClick={() => router.push("/suporte")}
                                >
                                    Falar com Suporte
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        )
    }

    return <>{children}</>
}
