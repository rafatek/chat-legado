"use client"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  Link2,
  BrainCircuit,
  User,
  HelpCircle,
  Zap,
  Wrench,
  Users,
  FolderKanban,
  ChevronDown,
  LogOut,
} from "lucide-react"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Leads",
    href: "/leads",
    icon: Users,
  },
  {
    name: "CRM",
    href: "/crm",
    icon: FolderKanban,
  },
  {
    name: "Conexões",
    href: "/conexoes",
    icon: Link2,
  },
  {
    name: "Agente IA",
    icon: BrainCircuit,
    submenu: [
      {
        name: "Agente de Prospecção",
        href: "/agente/prospeccao",
      },
      {
        name: "Agente de Atendimento",
        href: "/agente/atendimento",
      },
    ],
  },
  {
    name: "Ferramentas",
    icon: Wrench,
    submenu: [
      {
        name: "Extrator do Maps",
        href: "/ferramentas/maps",
      },
      {
        name: "Extrator de Instagram",
        href: "/ferramentas/instagram",
      },
      {
        name: "Extrator de CNPJ",
        href: "/ferramentas/cnpj",
      },
    ],
  },
  {
    name: "Minha Conta",
    href: "/conta",
    icon: User,
  },
  {
    name: "Suporte",
    href: "/suporte",
    icon: HelpCircle,
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [openMenus, setOpenMenus] = useState<string[]>(["Agente IA", "Ferramentas"])
  const [userName, setUserName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setUserName(user.user_metadata?.full_name || "Usuário")
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

  const toggleMenu = (name: string) => {
    setOpenMenus((prev) => (prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]))
  }

  return (
    <div className="flex h-screen w-64 flex-col border-r border-border bg-sidebar">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-border px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
          <Zap className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="text-xl font-bold text-sidebar-foreground">
          Prospekt<span className="text-primary">IA</span>
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {navigation.map((item) => {
          if (item.submenu) {
            const isOpen = openMenus.includes(item.name)
            const hasActiveChild = item.submenu.some((sub) => pathname === sub.href)

            return (
              <div key={item.name}>
                <button
                  onClick={() => toggleMenu(item.name)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    hasActiveChild
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </div>
                  <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
                </button>
                {isOpen && (
                  <div className="ml-8 mt-1 space-y-1">
                    {item.submenu.map((subItem) => {
                      const isActive = pathname === subItem.href
                      return (
                        <Link
                          key={subItem.href}
                          href={subItem.href}
                          className={cn(
                            "block rounded-lg px-3 py-2 text-sm transition-colors",
                            isActive
                              ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                              : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                          )}
                        >
                          {subItem.name}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          }

          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href!}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-4 space-y-3">
        {/* User Info Section */}
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
            <User className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 overflow-hidden">
            {loading ? (
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            ) : (
              <p className="text-sm font-medium truncate text-sidebar-foreground">
                {userName || "Usuário"}
              </p>
            )}
            <p className="text-xs text-muted-foreground truncate">Membro Pro</p>
          </div>
        </div>

        <div className="rounded-lg bg-sidebar-accent p-3">
          <p className="text-xs font-medium text-sidebar-accent-foreground">Plano Atual</p>
          <div className="flex justify-between items-end">
            <p className="mt-1 text-sm font-bold text-primary">Pro</p>
            <Zap className="h-3 w-3 text-yellow-500 mb-1" />
          </div>

          {/* Progress bar placeholder */}
          <div className="w-full bg-black/20 h-1 mt-2 rounded-full overflow-hidden">
            <div className="bg-primary h-full w-[65%]" />
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">325/500 leads usados</p>
        </div>

        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>
    </div>
  )
}
