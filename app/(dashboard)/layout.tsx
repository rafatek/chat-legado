import type React from "react"
import { DashboardShell } from "@/components/dashboard-shell"
import { SubscriptionGuard } from "@/components/subscription-guard"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DashboardShell>
      <SubscriptionGuard>
        <div className="h-full flex flex-col">
          {children}
        </div>
      </SubscriptionGuard>
    </DashboardShell>
  )
}

