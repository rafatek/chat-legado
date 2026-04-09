"use client"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  Link2,
  BrainCircuit,
  User,
  HelpCircle,
  FolderKanban,
  LogOut,
  Megaphone,
  MessageSquare,
} from "lucide-react"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "CRM/Kanban", href: "/crm", icon: FolderKanban },
  { name: "Atendimento", href: "/atendimento", icon: MessageSquare },
  { name: "Disparos", href: "/campanhas", icon: Megaphone },
  { name: "Conexões", href: "/conexoes", icon: Link2 },
  { name: "Agente IA", href: "/agente", icon: BrainCircuit },
  { name: "Minha Conta", href: "/conta", icon: User },
  { name: "Suporte", href: "/suporte", icon: HelpCircle },
]

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [userName, setUserName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single()

          setUserName(profile?.full_name || user.email?.split('@')[0] || "Usuário")
        }
      } catch (error) {
        console.error("Error fetching user details", error)
      } finally {
        setLoading(false)
      }
    }
    fetchUser()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace("/login")
  }

  return (
    <div className="flex h-screen w-64 flex-col border-r border-white/5 bg-[#050508]">
      <div className="flex h-40 items-center justify-center border-b border-white/5 px-6">
        <div className="relative flex items-center justify-center w-full">
          <img 
            src="/apple-icon.png" 
            alt="Legado" 
            className="h-28 w-auto object-contain drop-shadow-[0_0_15px_rgba(0,163,255,0.4)]"
          />
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-4 custom-scrollbar">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-black uppercase tracking-widest transition-all duration-200",
                isActive
                  ? "bg-[#00A3FF]/10 text-[#00A3FF] border border-[#00A3FF]/20"
                  : "text-gray-500 hover:bg-white/5 hover:text-white",
              )}
            >
              <item.icon className={cn("h-4 w-4", isActive ? "text-[#00A3FF]" : "text-gray-600")} />
              {item.name}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-white/5 p-4 space-y-3 bg-[#0A0A12]/50">
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#00A3FF]/20 border border-[#00A3FF]/30">
            <User className="h-4 w-4 text-[#00A3FF]" />
          </div>
          <div className="flex-1 overflow-hidden">
            {loading ? (
              <div className="h-3 w-20 bg-white/5 rounded animate-pulse" />
            ) : (
              <p className="text-xs font-black truncate text-white uppercase tracking-wider">
                {userName}
              </p>
            )}
            <p className="text-[9px] text-gray-600 uppercase tracking-tighter font-bold">Administrador</p>
          </div>
        </div>

        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full justify-start gap-3 text-gray-600 hover:text-red-500 hover:bg-red-500/10 h-9 px-2"
        >
          <LogOut className="h-4 w-4" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Sair</span>
        </Button>
      </div>
    </div>
  )
}