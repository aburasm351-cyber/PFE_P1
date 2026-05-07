"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Brain,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clipboard,
  Clock,
  Cpu,
  Database,
  FileText,
  Gauge,
  Heart,
  LineChart,
  Package,
  Settings,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  Wrench,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useI18n, LanguageSwitcher } from "@/lib/i18n"

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
}

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
}

export default function LandingPage() {
  const { t } = useI18n()

  const features = [
    {
      icon: Database,
      title: t("equipmentRegistry"),
      description: t("equipmentRegistryDesc"),
      color: "from-violet-500 to-purple-600",
    },
    {
      icon: AlertTriangle,
      title: t("incidentWorkflow"),
      description: t("incidentWorkflowDesc"),
      color: "from-orange-500 to-red-500",
    },
    {
      icon: Wrench,
      title: t("workOrderManagement"),
      description: t("workOrderManagementDesc"),
      color: "from-blue-500 to-cyan-500",
    },
    {
      icon: Clipboard,
      title: t("taskChecklists"),
      description: t("taskChecklistsDesc"),
      color: "from-green-500 to-emerald-500",
    },
    {
      icon: Calendar,
      title: t("planningCalendar"),
      description: t("planningCalendarDesc"),
      color: "from-pink-500 to-rose-500",
    },
    {
      icon: Gauge,
      title: t("metersThresholds"),
      description: t("metersThresholdsDesc"),
      color: "from-amber-500 to-yellow-500",
    },
    {
      icon: Package,
      title: t("sparePartsStock"),
      description: t("sparePartsStockDesc"),
      color: "from-teal-500 to-cyan-500",
    },
    {
      icon: Brain,
      title: t("aiPrioritization"),
      description: t("aiPrioritizationDesc"),
      color: "from-indigo-500 to-violet-500",
    },
    {
      icon: Sparkles,
      title: t("predictiveMaintenance"),
      description: t("predictiveMaintenanceDesc"),
      color: "from-fuchsia-500 to-pink-500",
    },
    {
      icon: BarChart3,
      title: t("biDashboards"),
      description: t("biDashboardsDesc"),
      color: "from-sky-500 to-blue-500",
    },
  ]

  const kpis = [
    {
      label: t("mtbf"),
      fullLabel: t("mtbfFull"),
      value: "720",
      unit: t("hours"),
      trend: "+12%",
      icon: Clock,
      color: "text-violet-600",
      bgColor: "bg-violet-50",
    },
    {
      label: t("mttr"),
      fullLabel: t("mttrFull"),
      value: "4.5",
      unit: t("hours"),
      trend: "-18%",
      icon: Wrench,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      label: t("availabilityRate"),
      fullLabel: t("availabilityRate"),
      value: "98.5",
      unit: "%",
      trend: "+2.3%",
      icon: Target,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      label: t("correctivePreventiveRatio"),
      fullLabel: t("correctivePreventiveRatio"),
      value: "35/65",
      unit: "%",
      trend: "-5%",
      icon: Activity,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      label: t("maintenanceCostEquipment"),
      fullLabel: t("maintenanceCostEquipment"),
      value: "$2,450",
      unit: "/year",
      trend: "-8%",
      icon: TrendingUp,
      color: "text-pink-600",
      bgColor: "bg-pink-50",
    },
    {
      label: t("maintenanceCostService"),
      fullLabel: t("maintenanceCostService"),
      value: "$12,500",
      unit: "/year",
      trend: "-12%",
      icon: LineChart,
      color: "text-cyan-600",
      bgColor: "bg-cyan-50",
    },
  ]

  const testimonials = [
    {
      quote: "MedCare GMAO has transformed our maintenance operations. Equipment downtime reduced by 40%.",
      author: "Dr. Marie Laurent",
      role: "Chief Medical Officer",
      hospital: "Central University Hospital",
    },
    {
      quote: "The AI-powered predictive maintenance has saved us over $500,000 in emergency repairs.",
      author: "Jean-Pierre Dubois",
      role: "Facilities Director",
      hospital: "North Regional Medical Center",
    },
    {
      quote: "Finally, a CMMS that understands hospital workflows. Our team adopted it within weeks.",
      author: "Sophie Bernard",
      role: "Biomedical Engineering Manager",
      hospital: "Children's Hospital Network",
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-600">
              <Heart className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">
              MedCare <span className="text-primary">GMAO</span>
            </span>
          </div>

          <div className="hidden items-center gap-8 md:flex">
            <Link href="#features" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              {t("features")}
            </Link>
            <Link href="#kpis" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              {t("kpiPreview")}
            </Link>
            <Link href="#testimonials" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              {t("testimonials")}
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link href="/login">
              <Button variant="ghost" className="hidden sm:flex">
                {t("signIn")}
              </Button>
            </Link>
            <Link href="/login">
              <Button >
                {t("requestDemo")}
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pb-20 pt-32 sm:pb-32 sm:pt-40">
        {/* Background Elements */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/4 top-0 h-[500px] w-[500px] rounded-full bg-violet-200/30 blur-3xl dark:bg-violet-900/20" />
          <div className="absolute right-1/4 top-1/4 h-[400px] w-[400px] rounded-full bg-orange-200/30 blur-3xl dark:bg-orange-900/20" />
          <div className="absolute bottom-0 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-blue-200/20 blur-3xl dark:bg-blue-900/10" />
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="initial"
            animate="animate"
            variants={staggerContainer}
            className="text-center"
          >
            <motion.div variants={fadeInUp} className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-2">
              <Sparkles className="h-4 w-4 text-violet-600" />
              <span className="text-sm font-medium text-muted-foreground">AI-Powered Hospital Maintenance</span>
            </motion.div>

            <motion.h1
              variants={fadeInUp}
              className="mx-auto max-w-4xl text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl"
            >
              {t("heroTitle")}
            </motion.h1>

            <motion.p
              variants={fadeInUp}
              className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground sm:text-xl"
            >
              {t("heroSubtitle")}
            </motion.p>

            <motion.div variants={fadeInUp} className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/login">
                <Button size="lg" className="h-12 gap-2 bg-gradient-to-r from-violet-600 to-purple-600 px-8 text-primary-foreground hover:from-violet-700 hover:to-purple-700">
                  {t("requestDemo")}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button size="lg" variant="outline" className="h-12 gap-2 px-8">
                  {t("exploreDashboard")}
                  <BarChart3 className="h-4 w-4" />
                </Button>
              </Link>
            </motion.div>

            {/* Trust Metrics */}
            <motion.div
              variants={fadeInUp}
              className="mt-16 grid grid-cols-2 gap-8 border-t border-border pt-8 sm:grid-cols-4"
            >
              {[
                { value: "500+", label: "Hospitals" },
                { value: "50,000+", label: "Equipment Managed" },
                { value: "99.9%", label: "Uptime" },
                { value: "40%", label: "Downtime Reduction" },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="text-2xl font-bold text-foreground sm:text-3xl">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="border-t border-border bg-muted/30 py-20 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">{t("features")}</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Everything you need for hospital-grade maintenance management
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="group h-full cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                  <CardContent className="flex h-full flex-col p-6">
                    <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${feature.color}`}>
                      <feature.icon className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <h3 className="mb-2 font-semibold text-foreground">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* KPI Section */}
      <section id="kpis" className="py-20 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">{t("kpiPreview")}</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Track the metrics that matter most for hospital maintenance excellence
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {kpis.map((kpi, index) => (
              <motion.div
                key={kpi.label}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">{kpi.fullLabel}</p>
                        <div className="mt-2 flex items-baseline gap-2">
                          <span className="text-3xl font-bold text-foreground">{kpi.value}</span>
                          <span className="text-sm text-muted-foreground">{kpi.unit}</span>
                        </div>
                        <div className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
                          kpi.trend.startsWith("+") ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                        }`}>
                          {kpi.trend.startsWith("+") ? <TrendingUp className="h-3 w-3" /> : <TrendingUp className="h-3 w-3 rotate-180" />}
                          {kpi.trend}
                        </div>
                      </div>
                      <div className={`rounded-xl p-3 ${kpi.bgColor} dark:bg-opacity-20`}>
                        <kpi.icon className={`h-6 w-6 ${kpi.color}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="border-t border-border bg-muted/30 py-20 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">{t("testimonials")}</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Trusted by leading healthcare institutions worldwide
            </p>
          </div>

          <div className="mt-16 grid gap-8 lg:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.author}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full">
                  <CardContent className="flex h-full flex-col p-6">
                    <div className="mb-4 flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Sparkles key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <p className="flex-1 text-muted-foreground">&ldquo;{testimonial.quote}&rdquo;</p>
                    <div className="mt-6 border-t border-border pt-4">
                      <p className="font-semibold text-foreground">{testimonial.author}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                      <p className="text-sm text-primary">{testimonial.hospital}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600 to-purple-600 px-8 py-16 text-center sm:px-16 sm:py-24">
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />
            <div className="relative">
              <h2 className="text-3xl font-bold text-primary-foreground sm:text-4xl">
                Ready to transform your hospital maintenance?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-primary-foreground/80">
                Join 500+ hospitals using MedCare GMAO to reduce downtime, cut costs, and improve patient safety.
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link href="/login">
                  <Button size="lg" className="h-12 gap-2 bg-white px-8 text-violet-600 hover:bg-white/90">
                    {t("requestDemo")}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/dashboard">
                  <Button size="lg" variant="outline" className="h-12 gap-2 border-white/30 px-8 text-primary-foreground hover:bg-white/10">
                    {t("exploreDashboard")}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-600">
                  <Heart className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold text-foreground">
                  MedCare <span className="text-primary">GMAO</span>
                </span>
              </div>
              <p className="mt-4 max-w-xs text-sm text-muted-foreground">
                The leading hospital CMMS platform for equipment management, maintenance workflows, and AI-powered predictive maintenance.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-foreground">{t("product")}</h3>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li><Link href="#features" className="hover:text-foreground">Features</Link></li>
                <li><Link href="#kpis" className="hover:text-foreground">KPIs</Link></li>
                <li><Link href="/dashboard" className="hover:text-foreground">Dashboard</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-foreground">{t("modules")}</h3>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li><Link href="/equipment" className="hover:text-foreground">{t("equipment")}</Link></li>
                <li><Link href="/claims" className="hover:text-foreground">{t("claims")}</Link></li>
                <li><Link href="/work-orders" className="hover:text-foreground">{t("workOrders")}</Link></li>
                <li><Link href="/inventory" className="hover:text-foreground">{t("inventory")}</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-foreground">{t("support")}</h3>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-foreground">{t("contact")}</Link></li>
                <li><Link href="#" className="hover:text-foreground">{t("security")}</Link></li>
                <li><Link href="#" className="hover:text-foreground">{t("privacyPolicy")}</Link></li>
                <li><Link href="#" className="hover:text-foreground">{t("termsOfService")}</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} MedCare GMAO. {t("allRightsReserved")}.
            </p>
            <div className="flex items-center gap-4">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">SOC 2 Type II Certified</span>
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <span className="text-sm text-muted-foreground">HIPAA Compliant</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
