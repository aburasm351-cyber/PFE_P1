"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { 
  BrainCircuit, AlertTriangle, ShieldAlert, Activity, Search,
  RefreshCw, ExternalLink, Wrench, TrendingUp, Gauge, Calendar, MapPin
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { aiApi } from "@/lib/api/ai"
import { workOrdersApi } from "@/lib/api/work-orders"
import type { PredictionResponse } from "@/lib/api/types"
import { toast } from "sonner"

const fadeInUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } }

export default function AiPredictivePage() {
  const router = useRouter()
  const [predictions, setPredictions] = useState<PredictionResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [riskFilter, setRiskFilter] = useState<string>("ALL")
  const [criticalityFilter, setCriticalityFilter] = useState<string>("ALL")
  const [isCreatingWo, setIsCreatingWo] = useState<number | null>(null)

  const loadData = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true)
    else setIsLoading(true)
    setError(null)
    try {
      const data = await aiApi.getPredictions()
      setPredictions(data)
    } catch (err: any) {
      console.error("Failed to load AI predictions", err)
      setError("Failed to load predictive data. Please try again.")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const filteredPredictions = predictions
    .filter(p => {
      const matchesSearch = search === "" || 
        (p.equipmentName?.toLowerCase().includes(search.toLowerCase())) ||
        (p.equipmentCode?.toLowerCase().includes(search.toLowerCase())) ||
        p.equipmentId.toString().includes(search)
      const matchesRisk = riskFilter === "ALL" || p.riskLevel === riskFilter
      const matchesCriticality = criticalityFilter === "ALL" || p.criticality === criticalityFilter
      return matchesSearch && matchesRisk && matchesCriticality
    })
    .sort((a, b) => b.finalRiskScore - a.finalRiskScore)

  const riskDistribution = {
    CRITICAL: predictions.filter(p => p.riskLevel === "CRITICAL").length,
    HIGH: predictions.filter(p => p.riskLevel === "HIGH").length,
    MEDIUM: predictions.filter(p => p.riskLevel === "MEDIUM").length,
    LOW: predictions.filter(p => p.riskLevel === "LOW").length,
  }

  const totalEquipment = predictions.length
  const interventionsNeeded = riskDistribution.HIGH + riskDistribution.CRITICAL
  const avgScore = totalEquipment > 0 
    ? Math.round(predictions.reduce((acc, p) => acc + p.finalRiskScore, 0) / totalEquipment) : 0

  const getRiskColor = (level: string) => {
    switch(level) {
      case "CRITICAL": return "bg-rose-500/10 text-rose-500"
      case "HIGH": return "bg-orange-500/10 text-orange-500"
      case "MEDIUM": return "bg-amber-500/10 text-amber-500"
      case "LOW": return "bg-emerald-500/10 text-emerald-500"
      default: return "bg-gray-500/10 text-gray-500"
    }
  }
  const getRiskProgressColor = (level: string) => {
    switch(level) {
      case "CRITICAL": return "bg-rose-500"
      case "HIGH": return "bg-orange-500"
      case "MEDIUM": return "bg-amber-500"
      case "LOW": return "bg-emerald-500"
      default: return "bg-gray-500"
    }
  }
  const getCriticalityColor = (crit: string | null | undefined) => {
    switch(crit) {
      case "CRITICAL": return "bg-rose-500/10 text-rose-500"
      case "HIGH": return "bg-orange-500/10 text-orange-500"
      case "MEDIUM": return "bg-amber-500/10 text-amber-500"
      case "LOW": return "bg-emerald-500/10 text-emerald-500"
      default: return "bg-gray-500/10 text-gray-500"
    }
  }
  const getSeverityColor = (sev: string) => {
    if (sev.includes("IMMINENT")) return "bg-rose-600 text-white"
    if (sev.includes("HIGH_FAILURE")) return "bg-rose-500/15 text-rose-600"
    if (sev.includes("DEGRADED")) return "bg-orange-500/15 text-orange-600"
    if (sev.includes("EARLY")) return "bg-amber-500/15 text-amber-600"
    return "bg-emerald-500/15 text-emerald-600"
  }

  const handleCreatePredictiveWo = async (pred: PredictionResponse) => {
    setIsCreatingWo(pred.equipmentId)
    try {
      const reasonsText = pred.reasons && pred.reasons.length > 0
        ? "\n\nRisk Factors:\n" + pred.reasons.map(f => "• " + f).join("\n") : ""
      const dueDate = pred.riskLevel === "CRITICAL" 
        ? new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString()
        : pred.riskLevel === "HIGH"
          ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          : new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()

      const description = `Predictive maintenance recommendation generated by AI risk scoring.

Final Risk Score: ${pred.finalRiskScore}/100
Risk Level: ${pred.riskLevel}
Suggested Severity: ${pred.suggestedSeverity}

Risk Breakdown:
- Age Risk: ${pred.ageRisk}/25
- Failure History Risk: ${pred.failureHistoryRisk}/40
- Meter Threshold Risk: ${pred.meterThresholdRisk}/20
- Predictive Outcome Credit: -${pred.predictiveOutcomeCredit}
- PoF Score (before multiplier): ${pred.pofScore}
- Criticality Multiplier: ${pred.criticalityMultiplier}x
${reasonsText}

Recommended Action:
${pred.recommendation}`

      const wo = await workOrdersApi.create({
        equipmentId: pred.equipmentId,
        woType: pred.suggestedWorkOrderType,
        priority: pred.suggestedPriority,
        title: `Predictive maintenance for ${pred.equipmentName || "Equipment #" + pred.equipmentId}`,
        description,
        dueDate,
      })
      toast.success(`Predictive work order created (WO #${wo.woId})`)
      router.push(`/work-orders/${wo.woId}`)
    } catch (err: any) {
      console.error("Failed to create predictive WO", err)
      toast.error("Failed to create predictive work order.")
    } finally {
      setIsCreatingWo(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 space-y-4">
        <Activity className="h-10 w-10 text-primary animate-pulse" />
        <p className="text-muted-foreground">Analyzing equipment risk profiles...</p>
      </div>
    )
  }
  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 space-y-4">
        <AlertTriangle className="h-10 w-10 text-destructive" />
        <p className="text-destructive font-medium">{error}</p>
        <Button onClick={() => loadData()}>Try Again</Button>
      </div>
    )
  }

  return (
    <motion.div initial="initial" animate="animate" className="flex-1 space-y-6 overflow-auto pb-10">
      {/* Header */}
      <motion.div variants={fadeInUp} className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 p-3 rounded-2xl shadow-inner">
            <BrainCircuit className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Predictive Maintenance</h1>
            <p className="text-muted-foreground italic">Rule-based risk scoring — identify equipment at risk before failure occurs.</p>
          </div>
        </div>
        <Button onClick={() => loadData(true)} variant="outline" className="gap-2" disabled={isRefreshing}>
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh Analysis
        </Button>
      </motion.div>

      {/* KPI Cards */}
      <motion.div variants={fadeInUp} className="grid gap-4 md:grid-cols-5">
        {[
          { label: "Equipment Monitored", value: totalEquipment, color: "text-primary" },
          { label: "High Risk", value: riskDistribution.HIGH, color: "text-orange-500" },
          { label: "Critical Risk", value: riskDistribution.CRITICAL, color: "text-rose-500" },
          { label: "Interventions Needed", value: interventionsNeeded, color: "text-amber-500" },
          { label: "Avg Risk Score", value: avgScore, color: "text-primary" },
        ].map(s => (
          <Card key={s.label} className="border-none bg-card/50 backdrop-blur-sm ring-1 ring-border">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle></CardHeader>
            <CardContent><div className={`text-2xl font-bold ${s.color}`}>{s.value}</div></CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Risk Distribution */}
      <motion.div variants={fadeInUp} className="grid gap-4 md:grid-cols-4">
        {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map((level) => {
          const count = riskDistribution[level]
          const pct = totalEquipment > 0 ? Math.round((count / totalEquipment) * 100) : 0
          return (
            <Card key={level} className="border-none bg-card/50 backdrop-blur-sm ring-1 ring-border">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className={`border-none text-xs ${getRiskColor(level)}`}>{level}</Badge>
                  <span className="text-sm font-bold">{count}</span>
                </div>
                <Progress value={pct} className="h-1.5" indicatorClassName={getRiskProgressColor(level)} />
                <p className="text-xs text-muted-foreground mt-1">{pct}% of monitored equipment</p>
              </CardContent>
            </Card>
          )
        })}
      </motion.div>

      {/* Filters */}
      <motion.div variants={fadeInUp} className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search equipment by name, code or ID..." className="pl-9 bg-card/50 border-border"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={riskFilter} onValueChange={setRiskFilter}>
          <SelectTrigger className="w-[150px] bg-card/50 border-border"><SelectValue placeholder="Risk Level" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Risk Levels</SelectItem>
            <SelectItem value="CRITICAL">Critical</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="LOW">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={criticalityFilter} onValueChange={setCriticalityFilter}>
          <SelectTrigger className="w-[160px] bg-card/50 border-border"><SelectValue placeholder="Criticality" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Criticalities</SelectItem>
            <SelectItem value="CRITICAL">Critical</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="LOW">Low</SelectItem>
            <SelectItem value="UNKNOWN">Unknown</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {/* Equipment Risk Table */}
      <motion.div variants={fadeInUp}>
        <Card className="border-none bg-card/50 backdrop-blur-sm ring-1 ring-border">
          <CardContent className="p-0">
            {predictions.length === 0 ? (
              <div className="py-20 text-center">
                <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Gauge className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No equipment data available</h3>
                <p className="text-muted-foreground">Equipment must be registered before predictive analysis can run.</p>
              </div>
            ) : filteredPredictions.length === 0 ? (
              <div className="py-20 text-center"><p className="text-muted-foreground">No equipment matches your filters.</p></div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Equipment</TableHead>
                      <TableHead>Criticality</TableHead>
                      <TableHead className="text-center">Age<br/><span className="text-[10px] text-muted-foreground">/25</span></TableHead>
                      <TableHead className="text-center">Failures<br/><span className="text-[10px] text-muted-foreground">/40</span></TableHead>
                      <TableHead className="text-center">Meter<br/><span className="text-[10px] text-muted-foreground">/20</span></TableHead>
                      <TableHead className="text-center">Pred. Credit</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Risk</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>State</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPredictions.map((pred) => (
                      <TableRow key={pred.equipmentId} className="group">
                        <TableCell>
                          <div>
                            <div className="font-medium">{pred.equipmentName || "Unknown"}</div>
                            <div className="text-xs text-muted-foreground">{pred.equipmentCode || `ID: ${pred.equipmentId}`}</div>
                            {pred.location && <div className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{pred.location}</div>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`border-none ${getCriticalityColor(pred.criticality)}`}>
                            {pred.criticality || "N/A"}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground ml-1">×{pred.criticalityMultiplier}</span>
                        </TableCell>
                        <TableCell className="text-center font-medium">{pred.ageRisk}</TableCell>
                        <TableCell className="text-center">
                          <span className={`font-medium ${pred.failureHistoryRisk >= 30 ? "text-rose-500" : ""}`}>{pred.failureHistoryRisk}</span>
                          <div className="text-[10px] text-muted-foreground">{pred.correctiveWoCount} WO</div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`font-medium ${pred.meterThresholdRisk >= 15 ? "text-orange-500" : ""}`}>{pred.meterThresholdRisk}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`font-medium text-emerald-500`}>-{pred.predictiveOutcomeCredit}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 min-w-[100px]">
                            <Progress value={pred.finalRiskScore} className="h-1.5 flex-1" indicatorClassName={getRiskProgressColor(pred.riskLevel)} />
                            <span className="text-sm font-bold w-8 text-right">{pred.finalRiskScore}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`border-none ${getRiskColor(pred.riskLevel)}`}>{pred.riskLevel}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`border-none text-[10px] ${getSeverityColor(pred.suggestedSeverity)}`}>
                            {pred.suggestedSeverity.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`border-none text-[10px]`}>
                            {pred.interventionState.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            <Button size="icon" variant="ghost" title="View Equipment"
                              onClick={() => router.push(`/equipment`)}>
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            {pred.interventionState === "WO_OPEN" || pred.interventionState === "AWAITING_VALIDATION" ? (
                              <Badge variant="outline" className="text-[10px] opacity-70">WO Active</Badge>
                            ) : pred.shouldSuggestWorkOrder ? (
                              <Button size="icon" variant="ghost"
                                className="text-amber-500 hover:text-amber-600 hover:bg-amber-500/10"
                                title="Create Predictive Work Order"
                                disabled={isCreatingWo === pred.equipmentId}
                                onClick={() => handleCreatePredictiveWo(pred)}>
                                <Wrench className="h-4 w-4" />
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Detail Cards for HIGH & CRITICAL */}
      {filteredPredictions.some(p => p.riskLevel === "CRITICAL" || p.riskLevel === "HIGH") && (
        <motion.div variants={fadeInUp}>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Risk Factor Details — High &amp; Critical Equipment
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {filteredPredictions
              .filter(p => p.riskLevel === "CRITICAL" || p.riskLevel === "HIGH")
              .map((pred) => (
                <Card key={`detail-${pred.equipmentId}`} className="border-none bg-card/50 backdrop-blur-sm ring-1 ring-border">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-base">{pred.equipmentName}</CardTitle>
                        <p className="text-xs text-muted-foreground">{pred.equipmentCode || `EQ-${pred.equipmentId}`}</p>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="outline" className={`border-none ${getRiskColor(pred.riskLevel)}`}>
                          {pred.riskLevel} — {pred.finalRiskScore}
                        </Badge>
                        <Badge variant="outline" className={`border-none text-[10px] ${getSeverityColor(pred.suggestedSeverity)}`}>
                          {pred.suggestedSeverity.replace(/_/g, " ")}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Factor Breakdown */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex justify-between bg-muted/30 rounded px-2 py-1.5">
                        <span className="text-muted-foreground">Age Risk</span>
                        <span className="font-semibold">{pred.ageRisk}/25</span>
                      </div>
                      <div className="flex justify-between bg-muted/30 rounded px-2 py-1.5">
                        <span className="text-muted-foreground">Failure History</span>
                        <span className="font-semibold">{pred.failureHistoryRisk}/40</span>
                      </div>
                      <div className="flex justify-between bg-muted/30 rounded px-2 py-1.5">
                        <span className="text-muted-foreground">Meter Threshold</span>
                        <span className="font-semibold">{pred.meterThresholdRisk}/20</span>
                      </div>
                      <div className="flex justify-between bg-muted/30 rounded px-2 py-1.5">
                        <span className="text-muted-foreground">Pred. Credit</span>
                        <span className="font-semibold text-emerald-500">-{pred.predictiveOutcomeCredit}</span>
                      </div>
                      <div className="flex justify-between bg-muted/30 rounded px-2 py-1.5">
                        <span className="text-muted-foreground">PoF Score</span>
                        <span className="font-semibold">{pred.pofScore}</span>
                      </div>
                      <div className="flex justify-between bg-muted/30 rounded px-2 py-1.5">
                        <span className="text-muted-foreground">Crit. Multiplier</span>
                        <span className="font-semibold">{pred.criticalityMultiplier}×</span>
                      </div>
                    </div>
                    {/* Meter & Anomaly summaries */}
                    {pred.meterStatusSummary && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Gauge className="h-3 w-3 shrink-0" /> {pred.meterStatusSummary}
                      </div>
                    )}
                    {pred.interventionState !== "NO_ACTION" && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <AlertTriangle className="h-3 w-3 shrink-0" /> State: {pred.interventionState.replace(/_/g, " ")}
                      </div>
                    )}
                    {/* Reasons */}
                    {pred.reasons && pred.reasons.length > 0 && (
                      <div className="bg-muted/30 rounded-lg p-3 space-y-1.5 border border-border/50">
                        {pred.reasons.map((reason, idx) => (
                          <div key={idx} className="text-xs text-muted-foreground flex items-start gap-1.5">
                            <div className="w-1 h-1 rounded-full bg-primary/40 mt-1.5 shrink-0" />
                            {reason}
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Recommendation */}
                    <div className="flex items-start gap-2 text-sm bg-primary/5 rounded-lg p-3 border border-primary/10">
                      <ShieldAlert className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span className="font-medium">{pred.recommendation}</span>
                    </div>
                    {/* Create WO button */}
                    {pred.shouldSuggestWorkOrder && (
                      <Button size="sm" className="w-full gap-2" variant="outline"
                        disabled={isCreatingWo === pred.equipmentId}
                        onClick={() => handleCreatePredictiveWo(pred)}>
                        <Wrench className="h-3.5 w-3.5" />
                        Create Predictive Work Order ({pred.suggestedPriority})
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
