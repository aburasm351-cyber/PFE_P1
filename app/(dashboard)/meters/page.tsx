"use client"

import { useEffect, useMemo, useState, type FormEvent } from "react"
import { motion } from "framer-motion"
import {
  Activity,
  AlertTriangle,
  Clock,
  Download,
  Filter,
  Gauge,
  Plus,
  RefreshCw,
  Search,
  TrendingUp,
  Wrench,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useI18n } from "@/lib/i18n"
import { metersApi } from "@/lib/api/meters"
import type { MeterLog, MeterLogRequest, MeterOperation, MeterResponse, MeterThreshold } from "@/lib/api/types"
import { mapMeterResponseToUiCard, type UiMeterCard } from "@/lib/adapters"
import { downloadCsv } from "@/lib/export"
import { ApiError } from "@/lib/api/client"
import { useToast } from "@/components/ui/use-toast"
import { workOrdersApi } from "@/lib/api/work-orders"
import { equipmentApi } from "@/lib/api/equipment"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
}

export default function MetersPage() {
  const { t, language } = useI18n()
  const isRtl = language === 'ar'
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 25

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  const showNotAvailable = (feature: string) => {
    toast({
      title: t('notAvailable'),
      description:
        language === "fr"
          ? `${feature} n’est pas supporté par le backend.`
          : `${feature} is not supported by the backend.`,
      variant: "destructive",
    })
  }

  const [meters, setMeters] = useState<MeterResponse[]>([])
  const [isFetching, setIsFetching] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [manageOpen, setManageOpen] = useState(false)
  const [manageMode, setManageMode] = useState<"manage" | "log" | "logs">("manage")
  const [selectedMeter, setSelectedMeter] = useState<UiMeterCard | null>(null)
  const [selectedMeterId, setSelectedMeterId] = useState<number | null>(null)
  const [thresholds, setThresholds] = useState<MeterThreshold[]>([])
  const [logs, setLogs] = useState<MeterLog[]>([])
  const [isManageLoading, setIsManageLoading] = useState(false)
  const [isLogsLoading, setIsLogsLoading] = useState(false)

  const [logOperation, setLogOperation] = useState<MeterOperation>("ADD")
  const [logAmount, setLogAmount] = useState<string>("")
  const [thresholdValue, setThresholdValue] = useState<string>("")
  const [thresholdLabel, setThresholdLabel] = useState<string>("")
  const [isSaving, setIsSaving] = useState(false)

  const { user } = useAuth()
  const [recommendationOpen, setRecommendationOpen] = useState(false)
  const [alertMeters, setAlertMeters] = useState<UiMeterCard[]>([])

  const getApiErrorMessage = (err: unknown): string => {
    if (err instanceof ApiError) {
      const payload = err.payload as unknown
      if (payload && typeof payload === "object") {
        const maybeError = (payload as Record<string, unknown>).error
        const maybeMessage = (payload as Record<string, unknown>).message
        if (typeof maybeError === "string" && maybeError.trim()) return maybeError
        if (typeof maybeMessage === "string" && maybeMessage.trim()) return maybeMessage
      }
      return `Request failed (${err.status})`
    }
    if (err instanceof Error && err.message) return err.message
    return "Request failed"
  }

  useEffect(() => {
    let cancelled = false
    setIsFetching(true)
    setError(null)
    const load = async () => {
      try {
        const res = await metersApi.getAll()
        if (cancelled) return
        setMeters(res)

        const uiM = res.map(mapMeterResponseToUiCard)
        const alerts = uiM.filter(m => m.status === 'warning' || m.status === 'critical')

        if (alerts.length > 0) {
          const activeWOs = await workOrdersApi.list({ type: 'PREVENTIVE' })
          const unsolvedAlerts = alerts.filter(m =>
            !activeWOs.some(wo => wo.equipmentId === m.equipmentId && wo.status !== 'CLOSED' && wo.status !== 'VALIDATED')
          )

          if (unsolvedAlerts.length > 0) {
            setAlertMeters(unsolvedAlerts)
            setRecommendationOpen(true)
          }
        }
      } catch {
        if (!cancelled) {
          setMeters([])
          setError(t('failedToLoadMeters'))
        }
      } finally {
        if (!cancelled) setIsFetching(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [language])

  useEffect(() => {
    let cancelled = false
    if (!manageOpen || !selectedMeterId) return
    setIsManageLoading(true)
    setThresholds([])
    setLogs([])
    setIsLogsLoading(true)
    const load = async () => {
      try {
        const [th, lg] = await Promise.all([
          metersApi.getThresholds(selectedMeterId),
          metersApi.getLogs(selectedMeterId),
        ])
        if (cancelled) return
        setThresholds(th)
        setLogs(lg)
      } catch {
        if (cancelled) return
        setThresholds([])
        setLogs([])
      } finally {
        if (cancelled) return
        setIsManageLoading(false)
        setIsLogsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [manageOpen, selectedMeterId])

  const uiMeters: UiMeterCard[] = useMemo(() => meters.map(mapMeterResponseToUiCard), [meters])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "critical":
        return "destructive"
      case "warning":
        return "secondary"
      default:
        return "outline"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "critical":
        return t('critical')
      case "warning":
        return t('warning')
      default:
        return t('normal')
    }
  }

  const getProgressColor = (status: string) => {
    switch (status) {
      case "critical":
        return "bg-red-500"
      case "warning":
        return "bg-amber-500"
      default:
        return "bg-emerald-500"
    }
  }

  const filteredMeters = useMemo(() => {
    return uiMeters.filter((meter) => {
      const q = searchQuery.toLowerCase()
      return (
        meter.name.toLowerCase().includes(q) ||
        meter.equipmentLabel.toLowerCase().includes(q)
      )
    })
  }, [searchQuery, uiMeters])

  const paginatedMeters = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredMeters.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredMeters, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filteredMeters.length / itemsPerPage)

  const stats = useMemo(() => {
    const total = uiMeters.length
    const normal = uiMeters.filter((m) => m.status === "normal").length
    const warning = uiMeters.filter((m) => m.status === "warning").length
    const critical = uiMeters.filter((m) => m.status === "critical").length
    return { total, normal, warning, critical }
  }, [uiMeters])

  const onExport = () => {
    downloadCsv(
      "meters.csv",
      ["id", "name", "equipment", "value", "unit", "threshold", "status", "lastReading"],
      filteredMeters.map((m) => [
        m.id,
        m.name,
        m.equipmentLabel,
        m.value,
        m.unit,
        m.primaryThreshold,
        m.status,
        m.lastReading,
      ])
    )
  }

  const onSyncAll = async () => {
    if (isFetching) return
    setIsFetching(true)
    setError(null)
    try {
      const res = await metersApi.getAll()
      setMeters(res)
      toast({ title: t('synced') })
    } catch {
      setMeters([])
      toast({
        title: t('syncFailed'),
        variant: "destructive",
      })
      setError(t('failedToLoadMeters'))
    } finally {
      setIsFetching(false)
    }
  }

  const openManage = (meter: UiMeterCard, mode: "manage" | "log" | "logs" = "manage") => {
    setSelectedMeter(meter)
    setSelectedMeterId(meter.id)
    setLogOperation("ADD")
    setLogAmount("")
    setThresholdValue("")
    setThresholdLabel("")
    setManageMode(mode)
    setManageOpen(true)
  }

  const onRecordLog = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedMeterId || isSaving) return
    const amount = Number(logAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      toast({
        title: t('invalidAmount'),
        variant: "destructive",
      })
      return
    }
    setIsSaving(true)
    try {
      const payload: MeterLogRequest = { operation: logOperation, amount }
      await metersApi.recordLog(selectedMeterId, payload)
      toast({ title: t('readingRecorded') })
      const [all, lg] = await Promise.all([
        metersApi.getAll(),
        metersApi.getLogs(selectedMeterId),
      ])
      setMeters(all)
      setLogs(lg)
      setLogAmount("")
    } catch (err) {
      toast({
        title: t('recordFailed'),
        description: getApiErrorMessage(err),
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const onCreateThreshold = async (e?: FormEvent) => {
    if (e) e.preventDefault()
    if (!selectedMeterId || isSaving) return
    const value = Number(thresholdValue)
    if (!Number.isFinite(value) || value <= 0) {
      toast({
        title: t('invalidThreshold'),
        variant: "destructive",
      })
      return
    }
    if (!thresholdLabel.trim()) {
      toast({
        title: t('nameIsRequired'),
        description: t('pleaseProvideANameFo'),
        variant: "destructive",
      })
      return
    }
    setIsSaving(true)
    try {
      await metersApi.createThreshold(selectedMeterId, { thresholdValue: value, label: thresholdLabel.trim() })
      toast({ title: t('thresholdAdded') })
      const [all, th] = await Promise.all([
        metersApi.getAll(),
        metersApi.getThresholds(selectedMeterId),
      ])
      setMeters(all)
      setThresholds(th)
      setThresholdValue("")
      setThresholdLabel("")
    } catch (err) {
      toast({
        title: t('addFailed'),
        description: getApiErrorMessage(err),
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCreatePreventiveWO = async (meter: UiMeterCard) => {
    if (isSaving || !meter.equipmentId) return
    setIsSaving(true)
    try {
      const equipRes = await equipmentApi.getById(meter.equipmentId)
      const equip = equipRes || { name: meter.equipmentLabel, assetCode: 'N/A', location: 'N/A' }

      const payload = {
        title: `PREVENTIVE: ${equip.name} (${meter.name})`,
        description: `Threshold ALERT: ${meter.value} ${meter.unit} (Threshold: ${meter.primaryThreshold} ${meter.unit}).\nEquipment: ${equip.name} [${equip.assetCode}]\nLocation: ${equip.location}\nSuggested Plan: Perform deep inspection and necessary component replacement.`,
        equipmentId: meter.equipmentId,
        priority: meter.status === 'critical' ? 'CRITICAL' : 'HIGH',
        woType: 'PREVENTIVE',
      }

      await workOrdersApi.create(payload)

      try {
        await equipmentApi.updateStatus(meter.equipmentId, 'UNDER_REPAIR')
      } catch (e) {
        console.warn("Failed to update equipment status", e)
      }

      toast({
        title: t('success'),
        description: t('preventiveWorkOrderC'),
      })

      setAlertMeters(prev => {
        const next = prev.filter(m => m.id !== meter.id)
        if (next.length === 0) setRecommendationOpen(false)
        return next
      })

      onSyncAll()
    } catch (err) {
      console.error("Failed to create preventive WO", err)
      toast({
        title: t('error'),
        description: getApiErrorMessage(err),
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const onResetMeter = async () => {
    if (!selectedMeterId || isSaving) return
    if (!window.confirm(t('resetMeterDesc'))) return
    
    setIsSaving(true)
    try {
      await metersApi.reset(selectedMeterId)
      toast({ 
        title: t('synced'),
        description: t('resetMeterDesc')
      })
      const all = await metersApi.getAll()
      setMeters(all)
      setManageOpen(false)
    } catch (err) {
      toast({
        title: t('error'),
        description: getApiErrorMessage(err),
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <Dialog open={recommendationOpen} onOpenChange={(open) => {
        if (!open) return;
        setRecommendationOpen(open);
      }}>
        <DialogContent showCloseButton={false} className="sm:max-w-xl bg-card border-border shadow-2xl overflow-hidden p-0 rounded-2xl">
          <div className="h-1 w-full bg-rose-500" />
          <div className="p-6 space-y-6">
            <DialogHeader>
              <div className={cn("flex items-center gap-3 text-rose-500 mb-1", isRtl && "flex-row-reverse")}>
                <div className="relative">
                  <AlertTriangle className="h-6 w-6" />
                  <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-primary-foreground ring-2 ring-card shadow-sm animate-in zoom-in duration-500">
                    {alertMeters.length}
                  </span>
                </div>
                <DialogTitle className="text-xl font-bold uppercase tracking-tight">
                  {t('thresholdExceededTitle')}
                </DialogTitle>
              </div>
              <DialogDescription className={cn("text-sm text-muted-foreground font-medium", isRtl && "text-right")}>
                {t('thresholdExceededDesc')}
              </DialogDescription>
            </DialogHeader>

            <div className={cn(
              "grid gap-3 max-h-[400px] overflow-y-auto pr-1",
              alertMeters.length > 1 ? "grid-cols-2" : "grid-cols-1"
            )}>
              {alertMeters.map(meter => (
                <div key={meter.id} className="p-4 rounded-xl bg-muted/40 border border-border/60 space-y-3 relative overflow-hidden group">
                  <div className={cn("flex justify-between items-start", isRtl && "flex-row-reverse")}>
                    <div className={cn("min-w-0 flex-1", isRtl && "text-right")}>
                      <p className="font-bold text-sm text-foreground truncate">{meter.equipmentLabel}</p>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">{meter.name}</p>
                    </div>
                    <Badge className={cn("text-[10px] h-5 px-1.5", meter.status === 'critical' ? 'bg-rose-500' : 'bg-amber-500')}>
                      {getStatusLabel(meter.status).toUpperCase()}
                    </Badge>
                  </div>

                  <div className={cn("flex items-baseline justify-between border-y border-border/10 py-2", isRtl && "flex-row-reverse")}>
                    <div className={cn("flex items-baseline gap-1", isRtl && "flex-row-reverse")}>
                      <span className="text-2xl font-black">{meter.value.toLocaleString()}</span>
                      <span className="text-[10px] font-bold text-muted-foreground">{meter.unit}</span>
                    </div>
                    <span className="text-[10px] font-black text-rose-500 uppercase">Limit: {meter.primaryThreshold?.toLocaleString() ?? '--'}</span>
                  </div>

                  <Button
                    onClick={() => handleCreatePreventiveWO(meter)}
                    disabled={isSaving}
                    className="w-full bg-primary hover:bg-primary/90 h-8 text-[10px] font-bold uppercase tracking-wider rounded-lg"
                  >
                    {isSaving ? <RefreshCw className="h-3 w-3 animate-spin mr-2" /> : <Wrench className={cn("h-3.5 w-3.5 mr-2", isRtl && "ml-2 mr-0")} />}
                    {t('createPreventiveWO')}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <motion.div variants={itemVariants} className={cn("flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between", isRtl && "sm:flex-row-reverse")}>
        <div className={isRtl ? "text-right" : "text-left"}>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("meters")}</h1>
          <p className="text-muted-foreground">{t('equipmentMeterTracki')}</p>
        </div>
        <div className={cn("flex flex-wrap items-center gap-2", isRtl && "flex-row-reverse")}>
          <Button variant="outline" size="sm" onClick={onSyncAll} disabled={isFetching} className="gap-2">
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
            {t('syncAll')}
          </Button>
        </div>
      </motion.div>

      <Dialog
        open={manageOpen}
        onOpenChange={(open) => {
          setManageOpen(open)
          if (!open) setManageMode("manage")
        }}
      >
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader className={isRtl ? "text-right" : "text-left"}>
            <DialogTitle>
              {t('manageMeter')}
            </DialogTitle>
            <DialogDescription>
              {selectedMeter ? `${selectedMeter.name} • ${selectedMeter.equipmentLabel}` : t('actions')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 pt-2">
            <div className={cn("flex flex-col gap-2 rounded-xl bg-muted/40 p-4 border border-border/50", isRtl && "items-end")}>
              <span className="text-xs font-bold text-muted-foreground uppercase">{t('currentValue')}</span>
              <span className="text-3xl font-black text-primary">{selectedMeter ? `${selectedMeter.value.toLocaleString()} ${selectedMeter.unit}` : "—"}</span>
            </div>

            <form onSubmit={onRecordLog} className="space-y-4">
              <h4 className={cn("text-sm font-semibold", isRtl && "text-right")}>{t('recordReading')}</h4>
              <div className={cn("flex gap-2 items-center", isRtl && "flex-row-reverse")}>
                <Select value={logOperation} onValueChange={(v) => setLogOperation(v as MeterOperation)}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Op" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADD">{t('add')}</SelectItem>
                    <SelectItem value="SUBTRACT">{t('subtract')}</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  value={logAmount}
                  onChange={(e) => setLogAmount(e.target.value)}
                  placeholder={t('amount')}
                  className={cn("flex-1", isRtl && "text-right")}
                  autoFocus={manageMode === "log"}
                />
              </div>
              <Button type="submit" className="w-full font-bold" disabled={isSaving || !selectedMeterId}>
                {t('record')}
              </Button>
            </form>

            <div className="space-y-3">
              <h4 className={cn("text-sm font-semibold", isRtl && "text-right")}>{t('thresholds')}</h4>
              {thresholds.length === 0 ? (
                <p className={cn("text-sm text-muted-foreground italic", isRtl && "text-right")}>{t('noData')}</p>
              ) : (
                <div className={cn("flex flex-wrap gap-2", isRtl && "flex-row-reverse")}>
                  {thresholds.sort((a, b) => a.thresholdValue - b.thresholdValue).map(th => (
                    <Badge key={th.id} variant="secondary" className="px-3 py-1 text-xs">
                      {th.label && <span className="font-bold text-primary mr-1">{th.label}:</span>}
                      {th.thresholdValue.toLocaleString()}
                    </Badge>
                  ))}
                </div>
              )}
              
              <div className={cn("grid grid-cols-[1fr,1fr,auto] gap-2 pt-2", isRtl && "grid-cols-[auto,1fr,1fr]")}>
                <Input
                  type="text"
                  value={thresholdLabel}
                  onChange={(e) => setThresholdLabel(e.target.value)}
                  placeholder={t('name')}
                  className={isRtl ? "text-right" : "text-left"}
                />
                <Input
                  type="number"
                  value={thresholdValue}
                  onChange={(e) => setThresholdValue(e.target.value)}
                  placeholder={t('value')}
                  onKeyDown={(e) => { if (e.key === 'Enter') onCreateThreshold() }}
                  className={isRtl ? "text-right" : "text-left"}
                />
                <Button onClick={() => onCreateThreshold()} variant="secondary" disabled={isSaving || !selectedMeterId}>{t('add')}</Button>
              </div>
            </div>

            {selectedMeter && (selectedMeter.status === 'warning' || selectedMeter.status === 'critical') && (
              <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 space-y-3 text-center">
                <p className={cn("text-sm font-black text-orange-600 uppercase flex items-center gap-2 justify-center", isRtl && "flex-row-reverse")}>
                  <Wrench className="h-4 w-4" /> {t('recommendation')}
                </p>
                <Button
                  onClick={() => handleCreatePreventiveWO(selectedMeter)}
                  disabled={isSaving}
                  variant="destructive"
                  className="w-full font-bold"
                >
                  {isSaving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Plus className={cn("h-4 w-4 mr-2", isRtl && "ml-2 mr-0")} />}
                  {t('createPreventiveWO')}
                </Button>
              </div>
            )}

            <div className="space-y-3 pt-4 border-t border-border">
              <h4 className={cn("text-sm font-semibold", isRtl && "text-right")}>{t('recentActivity')}</h4>
              <div className="space-y-2">
                {logs.sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()).slice(0, 3).map((l) => (
                  <div key={l.logId} className={cn("flex items-center justify-between text-sm py-1", isRtl && "flex-row-reverse")}>
                    <span className="font-medium text-muted-foreground">{l.operation === "ADD" ? "+" : "-"}{l.value}</span>
                    <span className="font-mono font-bold">→ {l.resultingValue}</span>
                  </div>
                ))}
                {logs.length === 0 && <p className={cn("text-sm text-muted-foreground italic", isRtl && "text-right")}>{t('noRecentActivity')}</p>}
              </div>
            </div>

            <div className="pt-4 border-t border-border text-center">
              <Button 
                variant="outline" 
                className="w-full text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 border-rose-500/20"
                onClick={onResetMeter}
                disabled={isSaving}
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", isSaving && "animate-spin", isRtl && "ml-2 mr-0")} />
                {t('resetMeterToZero')}
              </Button>
              <p className="text-[10px] text-muted-foreground mt-2">
                {t('resetMeterDesc')}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <motion.div variants={itemVariants} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className={cn("flex items-center gap-4 pt-6", isRtl && "flex-row-reverse text-right")}>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Gauge className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('totalMeters')}</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className={cn("flex items-center gap-4 pt-6", isRtl && "flex-row-reverse text-right")}>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
              <Activity className="h-6 w-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('normal')}</p>
              <p className="text-2xl font-bold">{stats.normal}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className={cn("flex items-center gap-4 pt-6", isRtl && "flex-row-reverse text-right")}>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('warning')}</p>
              <p className="text-2xl font-bold">{stats.warning}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className={cn("flex items-center gap-4 pt-6", isRtl && "flex-row-reverse text-right")}>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10">
              <TrendingUp className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('critical')}</p>
              <p className="text-2xl font-bold">{stats.critical}</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants} className={cn("flex flex-col gap-3 sm:flex-row", isRtl && "sm:flex-row-reverse")}>
        <div className="relative flex-1">
          <Search className={cn("absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground", isRtl ? "right-3" : "left-3")} />
          <Input
            placeholder={t('searchMeters')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(isRtl ? "pr-9 text-right" : "pl-9 text-left")}
          />
        </div>
        <Button
          variant="outline"
          onClick={() => showNotAvailable(t('filters'))}
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          {t('filters')}
        </Button>
        <Button variant="outline" onClick={onExport} disabled={filteredMeters.length === 0} className="gap-2">
          <Download className="h-4 w-4" />
          {t('export')}
        </Button>
      </motion.div>

      <motion.div variants={itemVariants} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isFetching ? (
          <Card className="col-span-full">
            <CardContent className="py-12 flex justify-center">
              <div className="flex flex-col items-center gap-4">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">{t('loading')}</p>
              </div>
            </CardContent>
          </Card>
        ) : error ? (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center text-destructive">{error}</CardContent>
          </Card>
        ) : paginatedMeters.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center text-muted-foreground">
              {t('noMeters')}
            </CardContent>
          </Card>
        ) : (
          paginatedMeters.map((meter, index) => (
            <motion.div
              key={meter.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="overflow-hidden group hover:border-primary/50 transition-all duration-300">
                <CardHeader className="pb-2">
                  <div className={cn("flex items-start justify-between", isRtl && "flex-row-reverse")}>
                    <div className={isRtl ? "text-right" : "text-left"}>
                      <p className="font-mono text-[10px] text-muted-foreground">{meter.displayId}</p>
                      <CardTitle className="text-base truncate">{meter.name}</CardTitle>
                    </div>
                    <Badge variant={getStatusColor(meter.status)} className="gap-1 capitalize">
                      {(meter.status === 'warning' || meter.status === 'critical') && (
                        <AlertTriangle className="h-3 w-3" />
                      )}
                      {getStatusLabel(meter.status)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className={cn("text-xs text-muted-foreground truncate", isRtl && "text-right")}>{meter.equipmentLabel}</p>

                  <div className="space-y-2">
                    <div className={cn("flex items-end justify-between", isRtl && "flex-row-reverse")}>
                      <span className="text-3xl font-black">{meter.value.toLocaleString()}</span>
                      <span className="text-xs font-bold text-muted-foreground mb-1">{meter.unit}</span>
                    </div>
                    {meter.thresholdDetails && meter.thresholdDetails.length > 0 ? (
                      <div className="space-y-2">
                        {meter.thresholdDetails
                          .slice()
                          .sort((a, b) => a.thresholdValue - b.thresholdValue)
                          .map((th, idx) => {
                            const cVal = th.currentValue ?? 0;
                            const percentage = th.thresholdValue > 0 ? Math.min(100, Math.round((cVal / th.thresholdValue) * 100)) : 0;
                            return (
                            <div key={th.id} className="space-y-1">
                              <div className={cn("flex items-center justify-between text-[10px] text-muted-foreground", isRtl && "flex-row-reverse")}>
                                <span className="font-medium truncate">
                                  {th.label ? th.label : (language === "fr" ? `Seuil ${idx + 1}` : `Threshold ${idx + 1}`)} • {th.thresholdValue.toLocaleString()}
                                </span>
                                <span className="font-bold">
                                  {percentage}%
                                </span>
                              </div>
                              <div className="h-1.5 overflow-hidden rounded-full bg-muted/50">
                                <div
                                  className={cn("h-full rounded-full transition-all duration-1000", getProgressColor(meter.status))}
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          )})
                        }
                      </div>
                    ) : (
                      <div className="h-1.5 rounded-full bg-muted/50 w-full" />
                    )}
                  </div>

                  <div className={cn("flex gap-2 pt-2", isRtl && "flex-row-reverse")}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 h-8 text-xs font-bold uppercase tracking-wider"
                      onClick={() => openManage(meter)}
                    >
                      {t('manage')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-primary"
                      onClick={() => openManage(meter, "log")}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </motion.div>

      {totalPages > 1 && (
        <motion.div variants={itemVariants} className={cn("flex items-center justify-between border-t border-border pt-4", isRtl && "flex-row-reverse")}>
          <p className="text-sm text-muted-foreground">
            {t('showing')} <span className="font-bold">{((currentPage - 1) * itemsPerPage) + 1}</span> {t('to')} <span className="font-bold">{Math.min(currentPage * itemsPerPage, filteredMeters.length)}</span> {t('of')} <span className="font-bold">{filteredMeters.length}</span>
          </p>
          <div className={cn("flex gap-2", isRtl && "flex-row-reverse")}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              {t('previous')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              {t('next')}
            </Button>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
