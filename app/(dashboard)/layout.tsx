import type React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { AppHeader } from "@/components/app-header"
import { SubscriptionGuard } from "@/components/subscription-guard"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <div className="flex flex-1 flex-col overflow-hidden h-screen">
        <AppHeader />
        <main className="flex-1 overflow-hidden p-6 flex flex-col">
          <SubscriptionGuard>
            <div className="h-full flex flex-col">
              {children}
            </div>
          </SubscriptionGuard>
        </main>
      </div>
    </div>
  )
}
