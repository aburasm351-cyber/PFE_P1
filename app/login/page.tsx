"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  Activity,
  BarChart3,
  Brain,
  Calendar,
  CheckCircle2,
  Eye,
  EyeOff,
  Heart,
  Lock,
  Mail,
  Package,
  Wrench,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { useI18n, LanguageSwitcher } from "@/lib/i18n"
import { useAuth } from "@/lib/auth-context"

export default function LoginPage() {
  const { t, language } = useI18n()
  const { login, isAuthenticated } = useAuth()
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/dashboard")
    }
  }, [isAuthenticated, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await login(email, password)
      router.replace("/dashboard")
    } catch {
      setError(t('loginFailed'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const features = [
    { icon: Package, text: t('equipmentManagement') },
    { icon: Calendar, text: t('maintenancePlanning') },
    { icon: Brain, text: t('predictiveAI') },
    { icon: BarChart3, text: t('bIDashboards') },
  ]

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Left Side - Marketing/Illustration */}
      <div className="relative hidden w-full overflow-hidden bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 lg:flex lg:w-1/2">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute left-0 top-0 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/5" />
        </div>

        <div className="relative flex h-full flex-col justify-between p-12">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <Heart className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-primary-foreground">
              MedCare GMAO
            </span>
          </div>

          {/* Center Content */}
          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h1 className="text-4xl font-bold leading-tight text-primary-foreground xl:text-5xl">
                {t('nextGenerationHospit')
                }
              </h1>
              <p className="mt-4 max-w-md text-lg text-primary-foreground/80">
                {language === "fr"
                  ? "Centralisez vos équipements, optimisez la maintenance et exploitez l'IA pour des opérations prédictives."
                  : "Centralize your equipment, optimize maintenance, and leverage AI for predictive operations."
                }
              </p>
            </motion.div>

            {/* Feature Pills */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-wrap gap-3"
            >
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 backdrop-blur-sm"
                >
                  <feature.icon className="h-4 w-4 text-primary-foreground" />
                  <span className="text-sm font-medium text-primary-foreground">{feature.text}</span>
                </div>
              ))}
            </motion.div>

            {/* Isometric Illustration - Simplified Abstract Representation */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 }}
              className="relative mt-8"
            >
              <div className="grid grid-cols-3 gap-4">
                <div className="h-32 rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
                  <div className="flex h-full flex-col justify-between">
                    <CheckCircle2 className="h-8 w-8 text-emerald-300" />
                    <div>
                      <div className="text-2xl font-bold text-primary-foreground">98.5%</div>
                      <div className="text-xs text-primary-foreground/70">{t('availability')}</div>
                    </div>
                  </div>
                </div>
                <div className="h-32 rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
                  <div className="flex h-full flex-col justify-between">
                    <Activity className="h-8 w-8 text-blue-300" />
                    <div>
                      <div className="text-2xl font-bold text-primary-foreground">156</div>
                      <div className="text-xs text-primary-foreground/70">{t('equipment')}</div>
                    </div>
                  </div>
                </div>
                <div className="h-32 rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
                  <div className="flex h-full flex-col justify-between">
                    <Wrench className="h-8 w-8 text-orange-300" />
                    <div>
                      <div className="text-2xl font-bold text-primary-foreground">24</div>
                      <div className="text-xs text-primary-foreground/70">{t('activeWOs')}</div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Security Badge */}
          <div className="flex items-center gap-3">
            <Lock className="h-5 w-5 text-primary-foreground/70" />
            <span className="text-sm text-primary-foreground/70">{t("secureLogin")}</span>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex w-full flex-col lg:w-1/2">
        {/* Top Bar */}
        <div className="flex items-center justify-between p-4 sm:p-6 lg:p-8">
          <Link href="/" className="flex items-center gap-2 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-600">
              <Heart className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">MedCare</span>
          </Link>
          <div className="hidden text-sm text-muted-foreground lg:block">
            {t('alreadyHaveAnAccount')}
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link href="/dashboard">
              <Button variant="outline" size="sm">
                {t("signIn")}
              </Button>
            </Link>
          </div>
        </div>

        {/* Form Container */}
        <div className="flex flex-1 items-center justify-center p-4 sm:p-6 lg:p-8">
          <div className="w-full max-w-md space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center lg:text-left"
            >
              <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
                {t("welcomeBack")}
              </h2>
              <p className="mt-2 text-muted-foreground">
                {t("loginToAccount")}
              </p>
            </motion.div>

            <motion.form
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              onSubmit={handleSubmit}
              className="space-y-6"
            >
              {/* Email Field */}
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-foreground">
                  {t("email")}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@hospital.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 pl-10"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-foreground">
                  {t("password")}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="8+ characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox id="remember" />
                  <label htmlFor="remember" className="text-sm text-muted-foreground">
                    {t("rememberMe")}
                  </label>
                </div>
                <Link href="#" className="text-sm font-medium text-primary hover:underline">
                  {t("forgotPassword")}
                </Link>
              </div>

              {/* Login Button */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-12 w-full"
              >
                {isSubmitting ? (t('signingIn')) : t("login")}
              </Button>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              {/* Social Login */}
              <div className="space-y-4">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      {t("createAccountWith")}
                    </span>
                  </div>
                </div>

                <div className="flex justify-center gap-4">
                  <Button variant="outline" size="icon" className="h-10 w-10 rounded-full">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </Button>
                  <Button variant="outline" size="icon" className="h-10 w-10 rounded-full">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                  </Button>
                  <Button variant="outline" size="icon" className="h-10 w-10 rounded-full">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  </Button>
                </div>
              </div>
            </motion.form>

          </div>
        </div>
      </div>
    </div>
  )
}
