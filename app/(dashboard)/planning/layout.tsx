"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Calendar, BarChart3, Kanban } from "lucide-react"
import { cn } from "@/lib/utils"

export default function PlanningLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const tabs = [
    { name: "Kanban Board", href: "/planning/kanban", icon: Kanban },
    { name: "Calendar View", href: "/planning/calendar", icon: Calendar },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Planning & Scheduling</h1>
          <p className="text-muted-foreground">Manage work order lifecycle and resource allocation.</p>
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-muted/30 w-fit rounded-xl border border-border/50">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all",
                isActive 
                  ? "bg-white text-primary shadow-sm" 
                  : "text-muted-foreground hover:bg-white/50 hover:text-foreground"
              )}
            >
              <tab.icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} />
              {tab.name}
            </Link>
          )
        })}
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {children}
      </div>
    </div>
  )
}
