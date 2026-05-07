"use client"

import type { ReactNode } from "react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { DashboardHeader } from "@/components/dashboard/header"
import { useAuth } from "@/lib/auth-context"
import { useI18n } from "@/lib/i18n"
import { RegulatoryDuePopup } from "@/components/regulatory/RegulatoryDuePopup"

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  const { language } = useI18n()
  const router = useRouter()

  const isRtl = language === 'ar'

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login")
    }
  }, [isAuthenticated, isLoading, router])

  return (
    <div className="flex min-h-screen bg-background" dir={isRtl ? 'rtl' : 'ltr'}>
      <DashboardSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <DashboardHeader />
        <main className="flex-1 p-2 sm:p-3 lg:p-4 overflow-auto">
          {children}
        </main>
      </div>
      <RegulatoryDuePopup />
    </div>
  )
}
