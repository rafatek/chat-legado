"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Brain, Lock } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"

// Helper for color interpolation
function lerp(start: number, end: number, t: number) {
  return start * (1 - t) + end * t
}

function DataNetworkBackground({ isError }: { isError: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Ref to store current interpolation state (0 = normal, 1 = error)
  const errorFactor = useRef(0)

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

      // Smoothly interpolate error factor towards target (0 or 1)
      const targetFactor = isError ? 1 : 0
      errorFactor.current = lerp(errorFactor.current, targetFactor, 0.1)

      // Base colors
      const normalBg = { r: 10, g: 10, b: 18 } // #0a0a12
      const errorBg = { r: 26, g: 5, b: 5 }   // Dark Red

      const normalNode = { r: 147, g: 51, b: 234 } // Purple
      const errorNode = { r: 220, g: 38, b: 38 }   // Red

      const normalLine = { r: 59, g: 130, b: 246 } // Blue
      const errorLine = { r: 220, g: 38, b: 38 }   // Red

      // Calculate current colors based on errorFactor
      const rBg = lerp(normalBg.r, errorBg.r, errorFactor.current)
      const gBg = lerp(normalBg.g, errorBg.g, errorFactor.current)
      const bBg = lerp(normalBg.b, errorBg.b, errorFactor.current)

      const rNode = lerp(normalNode.r, errorNode.r, errorFactor.current)
      const gNode = lerp(normalNode.g, errorNode.g, errorFactor.current)
      const bNode = lerp(normalNode.b, errorNode.b, errorFactor.current)

      const rLine = lerp(normalLine.r, errorLine.r, errorFactor.current)
      const gLine = lerp(normalLine.g, errorLine.g, errorFactor.current)
      const bLine = lerp(normalLine.b, errorLine.b, errorFactor.current)

      // Clear/Fill background
      ctx.fillStyle = `rgba(${rBg}, ${gBg}, ${bBg}, 0.2)`
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
        ctx.fillStyle = `rgba(${rNode}, ${gNode}, ${bNode}, 0.6)`
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
            ctx.strokeStyle = `rgba(${rLine}, ${gLine}, ${bLine}, ${opacity})`
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
  }, [isError])

  return <canvas ref={canvasRef} className="absolute inset-0 transition-colors duration-1000" />
}

function LaserScanner({ isError }: { isError: boolean }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className={`absolute inset-x-0 h-[2px] animate-scan transition-colors duration-500 
          ${isError ? "bg-gradient-to-r from-transparent via-red-500/50 to-transparent" : "bg-gradient-to-r from-transparent via-blue-400/30 to-transparent"}
        `}
      />
    </div>
  )
}

function LockHUD() {
  return (
    <motion.div
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{
        scale: [1.5, 1.0],
        opacity: 1,
        rotate: [0, -10, 10, -5, 5, 0]
      }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ duration: 0.5, type: "tween" }}
      className="absolute inset-0 z-50 flex flex-col items-center justify-center pointer-events-none"
    >
      <div className="relative">
        <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full" />
        <Lock className="w-24 h-24 text-red-500 relative z-10 drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]" />
      </div>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-4 text-red-500 font-bold tracking-[0.2em] text-xl drop-shadow-[0_0_10px_rgba(239,68,68,0.6)]"
      >
        ACCESS DENIED
      </motion.p>
    </motion.div>
  )
}

export default function LoginPage() {
  const [mounted, setMounted] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isError, setIsError] = useState(false)
  const router = useRouter()



  // Supabase client from global singleton (handled in imports)

  const handleLogin = async (e: React.MouseEvent | React.FormEvent) => {
    e.preventDefault()
    setIsError(false)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setIsError(true)
      setTimeout(() => {
        setIsError(false)
      }, 2000)
    } else {
      // Force refresh to ensure middleware picks up the new cookies
      router.refresh()
      // Wait a tick for cookies to settle then redirect
      setTimeout(() => {
        router.push('/dashboard')
      }, 500)
    }
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className={`relative flex min-h-screen items-center justify-center overflow-hidden transition-colors duration-500 p-4 
      ${isError ? "bg-[#1a0505]" : "bg-[#0a0a12]"}`}
    >
      <DataNetworkBackground isError={isError} />

      <div
        className={`absolute inset-0 bg-gradient-radial transition-colors duration-500
        ${isError
            ? "from-red-950/40 via-transparent to-red-950/40"
            : "from-purple-950/30 via-[#0a0a12] to-blue-950/30"
          }`}
      />

      <LaserScanner isError={isError} />

      <AnimatePresence>
        {isError && <LockHUD />}
      </AnimatePresence>

      <div
        className={`relative z-10 w-full max-w-md transition-all duration-1000 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
      >
        <div
          className={`flex flex-col items-center gap-4 mb-8 transition-all duration-700 delay-100 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
        >
          <div className={`relative flex h-16 w-16 items-center justify-center rounded-2xl shadow-[0_0_40px_rgba(147,51,234,0.6)] transition-colors duration-500
            ${isError ? "bg-gradient-to-br from-red-600 to-orange-600" : "bg-gradient-to-br from-blue-600 to-purple-600"}
          `}>
            {isError ? (
              <Lock className="h-9 w-9 text-white animate-pulse" />
            ) : (
              <Brain className="h-9 w-9 text-white animate-pulse" />
            )}

            <div className={`absolute inset-0 rounded-2xl border-2 animate-ping opacity-75 transition-colors duration-500
              ${isError ? "border-red-400" : "border-blue-400"}
            `} />
          </div>
          <h1 className="text-3xl font-bold tracking-wider">
            Prospekt
            <span className={`transition-colors duration-500 text-transparent bg-clip-text 
              ${isError ? "bg-gradient-to-r from-red-400 to-orange-500" : "bg-gradient-to-r from-blue-400 to-purple-500"}
            `}>
              IA
            </span>
          </h1>
          <p className="text-sm text-gray-400 tracking-wide">Sistema de Prospecção Inteligente</p>
        </div>

        <motion.div
          animate={isError ? { x: [-10, 10, -10, 10, 0] } : { x: 0 }}
          transition={{ duration: 0.4 }}
          className={`transition-all duration-700 delay-300 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
        >
          <Card className={`relative backdrop-blur-[20px] bg-white/[0.02] border transition-colors duration-500 shadow-2xl overflow-hidden
            ${isError ? "border-red-500/30" : "border-white/[0.05]"}
          `}>
            <div className={`absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent to-transparent transition-colors duration-500
              ${isError ? "via-red-400/50" : "via-blue-400/50"}
            `} />

            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-xl font-light tracking-wide">Acesso ao Sistema</CardTitle>
              <CardDescription className="text-gray-500">Insira suas credenciais para continuar</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div
                className={`space-y-2 transition-all duration-700 delay-500 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                  }`}
              >
                <Label htmlFor="email" className="text-xs uppercase tracking-widest text-gray-400">
                  E-mail
                </Label>
                <div className="relative">
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    id="email"
                    placeholder="seu@email.com"
                    required
                    className={`border-0 border-b rounded-none bg-transparent focus:ring-0 px-0 text-white placeholder:text-gray-600 transition-all duration-300
                      ${isError ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-blue-400"}
                    `}
                  />
                </div>
              </div>

              <div
                className={`space-y-2 transition-all duration-700 delay-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                  }`}
              >
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs uppercase tracking-widest text-gray-400">
                    Senha
                  </Label>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-gray-500 hover:text-blue-400 transition-colors tracking-wide"
                  >
                    Esqueceu?
                  </Link>
                </div>
                <div className="relative">
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                    id="password"
                    placeholder="••••••••"
                    required
                    className={`border-0 border-b rounded-none bg-transparent focus:ring-0 px-0 text-white placeholder:text-gray-600 transition-all duration-300
                      ${isError ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-blue-400"}
                    `}
                  />
                </div>
              </div>

              <div
                className={`transition-all duration-700 delay-900 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                  }`}
              >
                <Button onClick={handleLogin} className={`w-full text-white font-light tracking-wider uppercase text-sm py-6 relative overflow-hidden group transition-all duration-300 
                  ${isError
                    ? "bg-red-600 hover:bg-red-700 shadow-[0_0_30px_rgba(220,38,38,0.6)]"
                    : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 hover:shadow-[0_0_30px_rgba(59,130,246,0.6)]"}
                `}>
                  <span className="relative z-10">{isError ? "Acesso Negado" : "Entrar no Sistema"}</span>
                  {!isError && (
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out" />
                  )}
                </Button>
              </div>

              <p
                className={`text-center text-sm text-gray-500 tracking-wide transition-all duration-700 delay-1000 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                  }`}
              >
                Não tem acesso?{" "}
                <a
                  href={process.env.NEXT_PUBLIC_KIWIFY_CHECKOUT_URL || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                  onClick={(e) => {
                    if (!process.env.NEXT_PUBLIC_KIWIFY_CHECKOUT_URL) {
                      e.preventDefault()
                      console.warn("URL de checkout não configurada (NEXT_PUBLIC_KIWIFY_CHECKOUT_URL)")
                    }
                  }}
                >
                  Solicitar Cadastro
                </a>
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <div
          className={`mt-6 text-center text-xs text-gray-600 tracking-widest transition-all duration-700 delay-1100 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
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
