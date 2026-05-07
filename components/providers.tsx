"use client"

import type { ReactNode } from "react"
import { ThemeProvider } from "next-themes"
import { I18nProvider } from "@/lib/i18n"
import { AuthProvider } from "@/lib/auth-context"
import { ColorsProvider } from "@/lib/colors-context"
import { Toaster } from "@/components/ui/sonner"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <I18nProvider>
        <AuthProvider>
          <ColorsProvider>
            {children}
            <Toaster richColors closeButton position="top-right" />
          </ColorsProvider>
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  )
}
