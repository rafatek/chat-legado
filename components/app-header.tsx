"use client"

import { Bell, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function AppHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="flex h-16 items-center gap-4 px-6">
        {/* Search */}
        <div className="flex flex-1 items-center">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input type="search" placeholder="Buscar leads, mensagens..." className="pl-10" />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
          </Button>

          <Avatar className="h-9 w-9">
            <AvatarImage src="/placeholder.svg?height=36&width=36" />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">JD</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}
