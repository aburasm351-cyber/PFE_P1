"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import {
  Activity,
  AlertTriangle,
  Calendar,
  Clock,
  Database,
  Plus,
  Wrench,
  TrendingUp,
  Package,
  ShieldCheck,
  DollarSign,
  CheckCircle2,
  ChevronRight,
  Monitor,
  LayoutDashboard,
  Zap,
  Cpu,
  Timer,
  BarChart3,
  Hammer
} from "lucide-react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useI18n } from "@/lib/i18n"
import { useAuth } from "@/lib/auth-context"
import { DashboardSkeleton } from "@/components/dashboard/skeleton"
import { dashboardApi, type DashboardStats, type ActivityItem } from "@/lib/api/dashboard"
import { workOrdersApi } from "@/lib/api/work-orders"
import { claimsApi } from "@/lib/api/claims"
import { planningApi } from "@/lib/api/planning"
import type { WorkOrderResponse, ClaimListItemResponse } from "@/lib/api/types"
import { cn } from "@/lib/utils"
import { formatDistanceToNow, format } from "date-fns"
import { WorkOrderTypeBadge } from "@/components/work-order-type-badge"

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
}

// Availability trend data — built from last 6 months labels with dynamic values
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]

const DONUT_COLORS = ["#6366f1", "#f43f5e", "#f59e0b", "#10b981"]

export default function DashboardPage() {
  const { t, language } = useI18n()
  const { user } = useAuth()

  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [recentClaims, setRecentClaims] = useState<ClaimListItemResponse[]>([])
  const [recentWos, setRecentWos] = useState<WorkOrderResponse[]>([])
  const [upcomingPlans, setUpcomingPlans] = useState<any[]>([])
  const [myWork, setMyWork] = useState<WorkOrderResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(new Date())

  const isManager = user?.hasRole('ADMIN', 'MAINTENANCE_MANAGER') ?? false
  const isTechnician = user?.hasRole('TECHNICIAN') ?? false
  const isFinance = user?.hasRole('FINANCE_MANAGER') ?? false

  const loadData = useCallback(async () => {
    try {
      const [statsRes, activityRes, claimsRes, wosRes] = await Promise.all([
        dashboardApi.getStats(),
        dashboardApi.getActivity(),
        claimsApi.list({}).catch(() => []),
        workOrdersApi.list().catch(() => []),
      ])
      setStats(statsRes)
      setActivities(activityRes)
      setRecentClaims((claimsRes as ClaimListItemResponse[]).slice(0, 4))
      setRecentWos((wosRes as WorkOrderResponse[]).slice(0, 4))

      if (!isManager && user?.id) {
        const orders = await workOrdersApi.list({ assignedToUserId: user.id, status: 'IN_PROGRESS' }).catch(() => [])
        setMyWork(orders as WorkOrderResponse[])
      }

      // Upcoming maintenance plans
      const plans = await planningApi.getAll().catch(() => [])
      setUpcomingPlans((plans as any[]).slice(0, 4))

      setLastUpdated(new Date())
    } catch (err) {
      console.error("Dashboard refresh failed", err)
    } finally {
      setIsLoading(false)
    }
  }, [isManager, user?.id])

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 60000)
    return () => clearInterval(interval)
  }, [loadData])

  // Build availability trend from stats (simulated monthly progression based on real availability)
  const availabilityTrend = useMemo(() => {
    if (!stats) return []
    const base = stats.availabilityRate ?? 95
    return MONTHS.map((month, i) => ({
      month,
      MTBF: Math.round(stats.mtbfHours ?? 0) + (i * 12) - 30,
      "Availability Rate": parseFloat((base - 1.5 + i * 0.5).toFixed(1)),
    }))
  }, [stats])

  // Build donut data from real distribution
  const distributionData = useMemo(() => {
    if (!stats) return []
    return [
      { name: "Preventive", value: Math.round(stats.preventivePct ?? 0) },
      { name: "Corrective", value: Math.round(stats.correctivePct ?? 0) },
      { name: "Regulatory", value: Math.round(stats.regulatoryPct ?? 0) },
      { name: "Predictive", value: Math.round(stats.predictivePct ?? 0) },
    ].filter(d => d.value > 0)
  }, [stats])

  if (isLoading) {
    return <DashboardSkeleton />
  }

  return (
    <div className="space-y-3">
      {/* Header - Compact */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <h1 className="text-base font-semibold text-foreground">
            {t('dashboard')}
          </h1>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {format(lastUpdated, 'HH:mm')}
          </span>
        </div>
        <div className="flex gap-1.5">
          {(isManager || isTechnician) && (
            <Button size="sm" className="h-7 gap-1.5 bg-primary" asChild>
              <Link href="/claims/new"><Plus className="h-3 w-3" /> {t('newClaim')}</Link>
            </Button>
          )}
          {isManager && (
            <Button size="sm" variant="outline" className="h-7 gap-1.5" asChild>
              <Link href="/work-orders/new"><Wrench className="h-3 w-3" /> {t('newWorkOrder')}</Link>
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards - Compact Grid */}
      {(isManager || isFinance) && (
        <div className="grid gap-2 grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label={isFinance ? t("totalAssets") : t("totalEquipment")}
            value={stats?.totalEquipment}
            icon={<Cpu className="h-4 w-4" />}
            color="text-primary"
            bg="bg-primary/10"
          />
          <KpiCard
            label={t("activeWorkOrders")}
            value={stats?.activeWorkOrders}
            icon={<Wrench className="h-4 w-4" />}
            color="text-info"
            bg="bg-info/10"
          />
          <KpiCard
            label={isFinance ? t("inventoryValue") : t("pendingClaims")}
            value={isFinance ? `${(stats?.monthlySpend ? Number(stats.monthlySpend) * 5.5 : 2450000).toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} DA` : stats?.pendingClaims}
            icon={isFinance ? <Package className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            color="text-warning"
            bg="bg-warning/10"
          />
          <KpiCard
            label={isFinance ? t("monthSpend") : t("criticalAlerts")}
            value={isFinance ? `${Number(stats?.monthlySpend ?? 0).toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} DA` : stats?.criticalAlerts}
            icon={isFinance ? <DollarSign className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
            color="text-destructive"
            bg="bg-destructive/10"
          />
        </div>
      )}

      {isTechnician && (
        <div className="grid gap-2 grid-cols-3">
          <KpiCard
            label={t("myActiveTasks")}
            value={myWork.length}
            icon={<Timer className="h-4 w-4" />}
            color="text-info"
            bg="bg-info/10"
          />
          <KpiCard
            label={t("assignedWorkOrders")}
            value={stats?.activeWorkOrders}
            icon={<Wrench className="h-4 w-4" />}
            color="text-success"
            bg="bg-success/10"
          />
          <KpiCard
            label={t("equipmentAccess")}
            value={stats?.totalEquipment}
            icon={<Cpu className="h-4 w-4" />}
            color="text-primary"
            bg="bg-primary/10"
          />
        </div>
      )}

      {/* Charts - Compact */}
      {(isManager || isFinance) && (
        <div className="grid gap-2 lg:grid-cols-5">
          {/* Area Chart */}
          <Card className="lg:col-span-3">
            <CardHeader className="pb-1">
              <div className="flex items-center justify-between">
                <CardTitle>{isFinance ? t("expenseTrend") : t("availabilityTrend")}</CardTitle>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-primary inline-block" />MTBF</span>
                  <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-accent inline-block" />{t("availability")}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-[140px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={availabilityTrend} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradMtbf" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 10, padding: '4px 8px' }} />
                    <Area type="monotone" dataKey="MTBF" stroke="var(--primary)" strokeWidth={1.5} fill="url(#gradMtbf)" dot={false} />
                    <Area type="monotone" dataKey="Availability Rate" stroke="var(--accent)" strokeWidth={1.5} fill="transparent" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Donut Chart */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-1">
              <CardTitle>{isFinance ? t("budgetAllocation") : t("maintenanceDistribution")}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {distributionData.length === 0 ? (
                <div className="flex h-[140px] items-center justify-center text-muted-foreground text-xs">No data</div>
              ) : (
                <div className="h-[140px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={distributionData} cx="40%" cy="50%" innerRadius="50%" outerRadius="75%" dataKey="value" strokeWidth={1}>
                        {distributionData.map((_, i) => (
                          <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                        ))}
                      </Pie>
                      <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: 10 }} formatter={(value, entry: any) => (
                        <span className="text-[9px] text-muted-foreground">{value} <span className="font-semibold text-foreground">{entry.payload.value}%</span></span>
                      )} />
                      <Tooltip formatter={(val: number) => [`${val}%`, '']} contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 10 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Secondary Metrics - Compact */}
      {isManager && (
        <div className="grid gap-2 grid-cols-3">
          <SecondaryKpi label="MTBF" value={`${Math.round(stats?.mtbfHours ?? 0)}h`} icon={<Timer className="h-3.5 w-3.5 text-primary" />} />
          <SecondaryKpi label="MTTR" value={`${(stats?.mttrHours ?? 0).toFixed(1)}h`} icon={<Wrench className="h-3.5 w-3.5 text-info" />} />
          <SecondaryKpi label={t("availability")} value={`${(stats?.availabilityRate ?? 0).toFixed(1)}%`} icon={<ShieldCheck className="h-3.5 w-3.5 text-success" />} />
        </div>
      )}

      {/* Claims + Work Orders - Compact */}
      <div className="grid gap-2 lg:grid-cols-2">
        {isTechnician ? (
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t("myPendingWork")}</CardTitle>
              <Button variant="ghost" size="sm" className="h-5 text-[10px]" asChild>
                <Link href="/work-orders?assignedToMe=true">{t("viewAll")} <ChevronRight className="h-3 w-3" /></Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/50 max-h-40 overflow-y-auto">
                {myWork.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">{t("noAssignments")}</p>
                ) : myWork.slice(0, 4).map(wo => (
                  <Link key={wo.woId} href={`/work-orders/${wo.woId}`}>
                    <div className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted/50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{wo.title}</p>
                        <p className="text-[9px] text-muted-foreground">{wo.woCode}</p>
                      </div>
                      <StatusBadge status={wo.status} />
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : !isFinance && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t("recentClaims")}</CardTitle>
              <Button variant="ghost" size="sm" className="h-5 text-[10px]" asChild>
                <Link href="/claims">{t("viewAll")} <ChevronRight className="h-3 w-3" /></Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/50 max-h-40 overflow-y-auto">
                {recentClaims.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">{t("noClaims")}</p>
                ) : recentClaims.slice(0, 4).map(claim => (
                  <Link key={claim.claimId} href={`/claims/${claim.claimId}`}>
                    <div className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted/50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{claim.title}</p>
                        <p className="text-[9px] text-muted-foreground">{claim.claimCode ?? `CLM-${claim.claimId}`}</p>
                      </div>
                      <StatusBadge status={String(claim.status ?? '')} />
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className={isFinance ? "lg:col-span-2" : ""}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{isFinance ? t("criticalRequests") : t("recentWorkOrders")}</CardTitle>
            <Button variant="ghost" size="sm" className="h-5 text-[10px]" asChild>
              <Link href="/work-orders">{t("viewAll")} <ChevronRight className="h-3 w-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/50 max-h-40 overflow-y-auto">
              {recentWos.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">{t("noWorkOrders")}</p>
              ) : recentWos.slice(0, 4).map(wo => (
                <Link key={wo.woId} href={`/work-orders/${wo.woId}`}>
                  <div className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{wo.title}</p>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] text-muted-foreground">{wo.woCode}</span>
                        <WorkOrderTypeBadge type={wo.woType} lang={language as any} size="sm" />
                      </div>
                    </div>
                    <StatusBadge status={wo.status} />
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity + Bottom Widgets - Compact 3-column */}
      <div className="grid gap-2 lg:grid-cols-3">
        {/* Activity */}
        <Card className={isManager ? "" : "lg:col-span-2"}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-1.5"><Activity className="h-3.5 w-3.5 text-primary" /> {t("activity")}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/50 max-h-32 overflow-y-auto">
              {activities.length === 0 ? (
                <div className="py-4 text-center text-muted-foreground text-xs">{t("noActivity")}</div>
              ) : activities.slice(0, 5).map(item => (
                <ActivityRow key={item.id} item={item} />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Workload (manager only) */}
        {isManager && (
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5"><BarChart3 className="h-3.5 w-3.5 text-info" /> {t("technicianWorkload")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentWos.reduce((acc: { name: string; count: number }[], wo) => {
                  if (!wo.assignedToName) return acc
                  const found = acc.find(a => a.name === wo.assignedToName)
                  if (found) found.count++
                  else acc.push({ name: wo.assignedToName, count: 1 })
                  return acc
                }, []).slice(0, 3).map((tech, i) => (
                  <div key={i} className="space-y-0.5">
                    <div className="flex justify-between text-[10px]">
                      <span className="font-medium truncate">{tech.name}</span>
                      <span className="text-muted-foreground">{Math.min(100, tech.count * 25)}%</span>
                    </div>
                    <Progress value={Math.min(100, tech.count * 25)} className="h-1" />
                  </div>
                ))}
                {recentWos.filter(wo => wo.assignedToName).length === 0 && (
                  <p className="text-[10px] text-muted-foreground text-center py-2">{t("noAssignments")}</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card className="h-full">
          <CardHeader>
            <CardTitle>{t("quickActions")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { icon: <AlertTriangle className="h-3.5 w-3.5 text-warning" />, label: t("newClaim"), href: "/claims/new" },
                { icon: <Wrench className="h-3.5 w-3.5 text-info" />, label: t("workOrders"), href: "/work-orders" },
                { icon: <Cpu className="h-3.5 w-3.5 text-primary" />, label: t("equipment"), href: "/equipment" },
                { icon: <BarChart3 className="h-3.5 w-3.5 text-accent" />, label: "BI", href: "/bi/executive" },
              ].map((action, i) => (
                <Link key={i} href={action.href}>
                  <div className="flex items-center gap-1.5 p-2 rounded border border-border/50 hover:border-primary/40 hover:bg-muted/50 transition-colors">
                    {action.icon}
                    <span className="text-[10px] font-medium truncate">{action.label}</span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Compact Sub-Components
function KpiCard({ label, value, icon, color, bg }: any) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wide truncate">{label}</p>
            <p className="text-lg font-bold text-foreground mt-0.5">{value ?? '—'}</p>
          </div>
          <div className={cn("p-1.5 rounded shrink-0", bg, color)}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  )
}

function SecondaryKpi({ label, value, icon }: any) {
  return (
    <Card>
      <CardContent className="p-2 flex items-center gap-2">
        <div className="p-1.5 rounded bg-muted shrink-0">{icon}</div>
        <div className="min-w-0">
          <p className="text-[9px] text-muted-foreground uppercase truncate">{label}</p>
          <p className="text-sm font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'WO_STATUS': return <Wrench className="h-3 w-3 text-info" />
      case 'CLAIM_NEW': return <AlertTriangle className="h-3 w-3 text-destructive" />
      case 'RESTOCK_APPROVED': return <Package className="h-3 w-3 text-success" />
      default: return <Zap className="h-3 w-3 text-primary" />
    }
  }
  const url = item.type === 'WO_STATUS' ? `/work-orders/${item.referenceId}`
    : item.type === 'CLAIM_NEW' ? `/claims/${item.referenceId}` : '/inventory'

  return (
    <Link href={url}>
      <div className="flex gap-2 px-3 py-1.5 hover:bg-muted/50 transition-colors">
        <div className="h-5 w-5 rounded bg-muted shrink-0 flex items-center justify-center">
          {getIcon(item.type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium truncate">{item.title}</p>
            <span className="text-[9px] text-muted-foreground shrink-0">
              {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    IN_PROGRESS: 'bg-info/10 text-info',
    COMPLETED: 'bg-success/10 text-success',
    CREATED: 'bg-muted text-muted-foreground',
    SCHEDULED: 'bg-primary/10 text-primary',
    QUALIFIED: 'bg-accent/10 text-accent',
    ASSIGNED: 'bg-warning/10 text-warning',
    CLOSED: 'bg-muted text-muted-foreground',
    NEW: 'bg-warning/10 text-warning',
    CONVERTED_TO_WORK_ORDER: 'bg-primary/10 text-primary',
  }
  return (
    <span className={cn("text-[8px] px-1 py-0.5 rounded font-semibold uppercase whitespace-nowrap", map[status?.toUpperCase()] ?? 'bg-muted text-muted-foreground')}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}
