"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Brain } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'



function DataNetworkBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const nodes: { x: number; y: number; vx: number; vy: number }[] = []
    const nodeCount = 80

    // Create nodes (leads)
    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
      })
    }

    function animate() {
      if (!ctx || !canvas) return

      ctx.fillStyle = "rgba(10, 10, 18, 0.1)"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Update and draw nodes
      nodes.forEach((node, i) => {
        node.x += node.vx
        node.y += node.vy

        // Bounce off edges
        if (node.x < 0 || node.x > canvas.width) node.vx *= -1
        if (node.y < 0 || node.y > canvas.height) node.vy *= -1

        // Draw node
        ctx.beginPath()
        ctx.arc(node.x, node.y, 2, 0, Math.PI * 2)
        ctx.fillStyle = "rgba(147, 51, 234, 0.6)"
        ctx.fill()

        // Draw connections
        nodes.forEach((otherNode, j) => {
          if (i === j) return
          const dx = node.x - otherNode.x
          const dy = node.y - otherNode.y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < 150) {
            ctx.beginPath()
            ctx.moveTo(node.x, node.y)
            ctx.lineTo(otherNode.x, otherNode.y)
            const opacity = (1 - distance / 150) * 0.15
            ctx.strokeStyle = `rgba(59, 130, 246, ${opacity})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        })
      })

      requestAnimationFrame(animate)
    }

    animate()

    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0" />
}

function LaserScanner() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-blue-400/30 to-transparent animate-scan" />
    </div>
  )
}

export default function LoginPage() {
  const [mounted, setMounted] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleLogin = async (e: React.MouseEvent | React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      alert('Erro ao entrar: ' + error.message)
    } else {
      window.location.href = '/dashboard'
    }
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0a12] p-4">
      {/* Animated Data Network Background */}
      <DataNetworkBackground />

      {/* Deep Dark Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-radial from-purple-950/30 via-[#0a0a12] to-blue-950/30" />

      {/* Laser Scanner */}
      <LaserScanner />

      <div
        className={`relative z-10 w-full max-w-md transition-all duration-1000 ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        {/* Logo with AI Status Circle */}
        <div
          className={`flex flex-col items-center gap-4 mb-8 transition-all duration-700 delay-100 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 shadow-[0_0_40px_rgba(147,51,234,0.6)]">
            <Brain className="h-9 w-9 text-white animate-pulse" />
            {/* AI Processing Ring */}
            <div className="absolute inset-0 rounded-2xl border-2 border-blue-400 animate-ping opacity-75" />
          </div>
          <h1 className="text-3xl font-bold tracking-wider">
            Prospekt
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">AI</span>
          </h1>
          <p className="text-sm text-gray-400 tracking-wide">Sistema de Prospecção Inteligente</p>
        </div>

        {/* Glassmorphism Card */}
        <div
          className={`transition-all duration-700 delay-300 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <Card className="relative backdrop-blur-[20px] bg-white/[0.02] border border-white/[0.05] shadow-2xl overflow-hidden">
            {/* Subtle top gradient accent */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-400/50 to-transparent" />

            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-xl font-light tracking-wide">Acesso ao Sistema</CardTitle>
              <CardDescription className="text-gray-500">Insira suas credenciais para continuar</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Email Input - Minimalist Style */}
              <div
                className={`space-y-2 transition-all duration-700 delay-500 ${
                  mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                }`}
              >
                <Label htmlFor="email" className="text-xs uppercase tracking-widest text-gray-400">
                  E-mail
                </Label>
                <div className="relative">
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    required
                    className="border-0 border-b border-white/10 rounded-none bg-transparent focus:border-blue-400 focus:ring-0 px-0 text-white placeholder:text-gray-600 transition-all duration-300"
                  /> 
                </div>
              </div>

              {/* Password Input - Minimalist Style */}
              <div
                className={`space-y-2 transition-all duration-700 delay-700 ${
                  mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                }`}
              >
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs uppercase tracking-widest text-gray-400">
                    Senha
                  </Label>
                  <Link
                    href="/recuperar-senha"
                    className="text-xs text-gray-500 hover:text-blue-400 transition-colors tracking-wide"
                  >
                    Esqueceu?
                  </Link>
                </div>
                <div className="relative">
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    required
                    className="border-0 border-b border-white/10 rounded-none bg-transparent focus:border-blue-400 focus:ring-0 px-0 text-white placeholder:text-gray-600 transition-all duration-300"
                  />
                </div>
              </div>

              {/* Login Button with Liquid Glow Effect */}
              <div
                className={`transition-all duration-700 delay-900 ${
                  mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                }`}
              >
                <Button onClick={handleLogin} className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-light tracking-wider uppercase text-sm py-6 relative overflow-hidden group transition-all duration-300 hover:shadow-[0_0_30px_rgba(59,130,246,0.6)]">
                  <span className="relative z-10">Entrar no Sistema</span>
                  {/* Liquid fill effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out" />
                </Button>
              </div>

              {/* Sign up link */}
              <p
                className={`text-center text-sm text-gray-500 tracking-wide transition-all duration-700 delay-1000 ${
                  mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                }`}
              >
                Não tem acesso?{" "}
                <Link href="/cadastro" className="text-blue-400 hover:text-blue-300 transition-colors">
                  Solicitar Cadastro
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Tech Label */}
        <div
          className={`mt-6 text-center text-xs text-gray-600 tracking-widest transition-all duration-700 delay-1100 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          POWERED BY ARTIFICIAL INTELLIGENCE
        </div>
      </div>

      <style jsx>{`
        @keyframes scan {
          0% {
            top: -2px;
          }
          100% {
            top: 100%;
          }
        }
        .animate-scan {
          animation: scan 8s linear infinite;
        }
      `}</style>
    </div>
  )
}
