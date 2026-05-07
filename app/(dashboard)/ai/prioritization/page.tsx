"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { 
  BrainCircuit, 
  Activity,
  Search,
  RefreshCw,
  Check,
  X,
  Edit2,
  Eye,
  Zap
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

import { aiApi } from "@/lib/api/ai"
import type { 
  PriorityDashboardResponse, 
  PrioritySuggestionResponse,
  ClaimPriority,
  SlaStatus,
  PriorityDecisionStatus
} from "@/lib/api/types"

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 }
}

export default function AiPrioritizationPage() {
  const router = useRouter()
  
  // State
  const [dashboard, setDashboard] = useState<PriorityDashboardResponse | null>(null)
  const [suggestions, setSuggestions] = useState<PrioritySuggestionResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [search, setSearch] = useState("")
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL")
  const [slaFilter, setSlaFilter] = useState<string>("ALL")
  const [decisionFilter, setDecisionFilter] = useState<string>("ALL")

  // Dialogs
  const [overrideDialog, setOverrideDialog] = useState<{ isOpen: boolean; suggestionId: number | null }>({ isOpen: false, suggestionId: null })
  const [rejectDialog, setRejectDialog] = useState<{ isOpen: boolean; suggestionId: number | null }>({ isOpen: false, suggestionId: null })
  
  // Dialog Form State
  const [overridePriority, setOverridePriority] = useState<ClaimPriority | "">("")
  const [overrideDate, setOverrideDate] = useState<string>("")
  const [overrideReason, setOverrideReason] = useState("")
  const [rejectReason, setRejectReason] = useState("")
  
  // Action state
  const [isActing, setIsActing] = useState(false)

  const loadData = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true)
    else setIsLoading(true)
    setError(null)
    
    try {
      const [dashData, suggData] = await Promise.all([
        aiApi.getPriorityDashboard(),
        aiApi.getPrioritySuggestions()
      ])
      setDashboard(dashData)
      setSuggestions(suggData)
    } catch (err: any) {
      console.error("Failed to load prioritization data", err)
      setError("Failed to load data. Please try again.")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Filtering
  const filteredSuggestions = suggestions.filter(s => {
    const matchesSearch = search === "" || s.claimTitle.toLowerCase().includes(search.toLowerCase()) || s.claimId.toString().includes(search)
    const matchesPriority = priorityFilter === "ALL" || s.suggestedPriority === priorityFilter
    const matchesSla = slaFilter === "ALL" || s.slaStatus === slaFilter
    const matchesDecision = decisionFilter === "ALL" || s.decisionStatus === decisionFilter
    return matchesSearch && matchesPriority && matchesSla && matchesDecision
  })

  // Format Helpers
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "-"
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return dateStr
    }
  }

  const getPriorityColor = (priority: ClaimPriority | string) => {
    switch(priority) {
      case 'CRITICAL': return "bg-rose-500/10 text-rose-500 hover:bg-rose-500/20"
      case 'HIGH': return "bg-orange-500/10 text-orange-500 hover:bg-orange-500/20"
      case 'MEDIUM': return "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
      case 'LOW': return "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
      default: return "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20"
    }
  }

  const getSlaColor = (status: SlaStatus | string) => {
    switch(status) {
      case 'BREACHED': return "bg-rose-500/10 text-rose-500"
      case 'AT_RISK': return "bg-orange-500/10 text-orange-500"
      case 'SAFE': return "bg-emerald-500/10 text-emerald-500"
      default: return "bg-gray-500/10 text-gray-500"
    }
  }

  const getDecisionColor = (status: PriorityDecisionStatus | string) => {
    switch(status) {
      case 'ACCEPTED': return "bg-emerald-500/10 text-emerald-500"
      case 'OVERRIDDEN': return "bg-blue-500/10 text-blue-500"
      case 'REJECTED': return "bg-rose-500/10 text-rose-500"
      case 'PENDING': return "bg-amber-500/10 text-amber-500"
      default: return "bg-gray-500/10 text-gray-500"
    }
  }

  // Actions
  const handleCalculate = async (claimId: number) => {
    setIsActing(true)
    try {
      await aiApi.calculateClaimPriority(claimId)
      toast.success("Recalculated priority successfully")
      loadData(true)
    } catch (e) {
      toast.error("Failed to recalculate")
    } finally {
      setIsActing(false)
    }
  }

  const handleAccept = async (id: number) => {
    setIsActing(true)
    try {
      await aiApi.acceptPrioritySuggestion(id, { note: "Accepted from dashboard" })
      toast.success("Suggestion accepted")
      loadData(true)
    } catch (e) {
      toast.error("Failed to accept suggestion")
    } finally {
      setIsActing(false)
    }
  }

  const submitOverride = async () => {
    if (!overrideDialog.suggestionId || !overridePriority || !overrideReason) {
      toast.error("Priority and Reason are required")
      return
    }
    setIsActing(true)
    try {
      await aiApi.overridePrioritySuggestion(overrideDialog.suggestionId, {
        finalPriority: overridePriority as ClaimPriority,
        finalDueDate: overrideDate ? new Date(overrideDate).toISOString() : null,
        reason: overrideReason
      })
      toast.success("Suggestion overridden")
      setOverrideDialog({ isOpen: false, suggestionId: null })
      setOverridePriority("")
      setOverrideDate("")
      setOverrideReason("")
      loadData(true)
    } catch (e) {
      toast.error("Failed to override")
    } finally {
      setIsActing(false)
    }
  }

  const submitReject = async () => {
    if (!rejectDialog.suggestionId || !rejectReason) {
      toast.error("Reason is required")
      return
    }
    setIsActing(true)
    try {
      await aiApi.rejectPrioritySuggestion(rejectDialog.suggestionId, {
        reason: rejectReason
      })
      toast.success("Suggestion rejected")
      setRejectDialog({ isOpen: false, suggestionId: null })
      setRejectReason("")
      loadData(true)
    } catch (e) {
      toast.error("Failed to reject")
    } finally {
      setIsActing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 space-y-4">
        <Activity className="h-10 w-10 text-primary animate-pulse" />
        <p className="text-muted-foreground">Loading AI Prioritization Dashboard...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 space-y-4">
        <p className="text-destructive font-medium">{error}</p>
        <Button onClick={() => loadData()}>Try Again</Button>
      </div>
    )
  }

  return (
    <motion.div 
      initial="initial" 
      animate="animate" 
      className="flex-1 space-y-6 overflow-auto pb-10"
    >
      {/* Header */}
      <motion.div variants={fadeInUp} className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
           <div className="bg-primary/10 p-3 rounded-2xl shadow-inner">
             <BrainCircuit className="h-8 w-8 text-primary" />
           </div>
           <div>
             <h1 className="text-3xl font-bold tracking-tight text-foreground">
               Automatic Prioritization
             </h1>
             <p className="text-muted-foreground italic">
               Review AI-generated priority and due-date suggestions for claims.
             </p>
           </div>
        </div>
        <Button onClick={() => loadData(true)} variant="outline" className="gap-2" disabled={isRefreshing}>
           <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
           Refresh Data
        </Button>
      </motion.div>

      {/* KPI Cards */}
      {dashboard && (
        <motion.div variants={fadeInUp} className="grid gap-4 md:grid-cols-4 lg:grid-cols-5">
          <Card className="border-none bg-card/50 backdrop-blur-sm ring-1 ring-border">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Pending Decisions</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-amber-500">{dashboard.pendingManagerDecisions}</div></CardContent>
          </Card>
          <Card className="border-none bg-card/50 backdrop-blur-sm ring-1 ring-border">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Critical / High</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-rose-500">{dashboard.criticalSuggestions} / {dashboard.highSuggestions}</div></CardContent>
          </Card>
          <Card className="border-none bg-card/50 backdrop-blur-sm ring-1 ring-border">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">SLA At Risk / Breached</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-orange-500">{dashboard.slaAtRisk} / {dashboard.slaBreached}</div></CardContent>
          </Card>
          <Card className="border-none bg-card/50 backdrop-blur-sm ring-1 ring-border">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Acceptance Rate</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-emerald-500">{dashboard.acceptanceRate}%</div></CardContent>
          </Card>
          <Card className="border-none bg-card/50 backdrop-blur-sm ring-1 ring-border">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Avg Score</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-primary">{dashboard.averagePriorityScore}</div></CardContent>
          </Card>
        </motion.div>
      )}

      {/* Filters */}
      <motion.div variants={fadeInUp} className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search claims..." 
            className="pl-9 bg-card/50 border-border"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[150px] bg-card/50 border-border">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Priorities</SelectItem>
            <SelectItem value="CRITICAL">Critical</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="LOW">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={slaFilter} onValueChange={setSlaFilter}>
          <SelectTrigger className="w-[150px] bg-card/50 border-border">
            <SelectValue placeholder="SLA Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All SLAs</SelectItem>
            <SelectItem value="SAFE">Safe</SelectItem>
            <SelectItem value="AT_RISK">At Risk</SelectItem>
            <SelectItem value="BREACHED">Breached</SelectItem>
            <SelectItem value="NO_DUE_DATE">No Due Date</SelectItem>
          </SelectContent>
        </Select>
        <Select value={decisionFilter} onValueChange={setDecisionFilter}>
          <SelectTrigger className="w-[160px] bg-card/50 border-border">
            <SelectValue placeholder="Decision Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Decisions</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="ACCEPTED">Accepted</SelectItem>
            <SelectItem value="OVERRIDDEN">Overridden</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {/* Main Table */}
      <motion.div variants={fadeInUp}>
        <Card className="border-none bg-card/50 backdrop-blur-sm ring-1 ring-border">
          <CardContent className="p-0">
            {suggestions.length === 0 ? (
              <div className="py-20 text-center">
                <div className="bg-indigo-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="h-8 w-8 text-indigo-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No suggestions yet</h3>
                <p className="text-muted-foreground mb-6">
                  The AI needs to analyze a claim to generate a priority suggestion.<br/>
                  Open any existing claim to calculate its priority.
                </p>
                <Link href="/claims">
                  <Button variant="outline" className="border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100">
                    Go to Claims
                  </Button>
                </Link>
              </div>
            ) : filteredSuggestions.length === 0 ? (
              <div className="py-20 text-center">
                <p className="text-muted-foreground">No priority suggestions match your filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Claim ID</TableHead>
                      <TableHead>Claim Title</TableHead>
                      <TableHead>Score / Conf.</TableHead>
                      <TableHead>Suggested</TableHead>
                      <TableHead>Due Date (Sug.)</TableHead>
                      <TableHead>SLA</TableHead>
                      <TableHead>Decision</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSuggestions.map((s) => (
                      <TableRow key={s.id} className="group">
                        <TableCell className="font-medium">#{s.claimId}</TableCell>
                        <TableCell className="max-w-[200px] truncate" title={s.claimTitle}>{s.claimTitle}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="font-bold">{s.score}</span>
                            <span className="text-xs text-muted-foreground">{s.confidence}% conf</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`border-none ${getPriorityColor(s.suggestedPriority)}`}>
                            {s.suggestedPriority}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(s.suggestedDueDate)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`border-none ${getSlaColor(s.slaStatus)}`}>
                            {s.slaStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`border-none ${getDecisionColor(s.decisionStatus)}`}>
                            {s.decisionStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              title="View Claim"
                              onClick={() => router.push(`/claims/${s.claimId}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            
                            {s.decisionStatus === 'PENDING' && (
                              <>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10"
                                  title="Accept"
                                  disabled={isActing}
                                  onClick={() => handleAccept(s.id)}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="text-blue-500 hover:text-blue-600 hover:bg-blue-500/10"
                                  title="Override"
                                  disabled={isActing}
                                  onClick={() => {
                                    setOverrideDialog({ isOpen: true, suggestionId: s.id })
                                    setOverridePriority(s.suggestedPriority)
                                  }}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                                  title="Reject"
                                  disabled={isActing}
                                  onClick={() => setRejectDialog({ isOpen: true, suggestionId: s.id })}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            
                            {s.decisionStatus !== 'PENDING' && (
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="text-primary hover:bg-primary/10"
                                title="Recalculate"
                                disabled={isActing}
                                onClick={() => handleCalculate(s.claimId)}
                              >
                                <Zap className="h-4 w-4" />
                              </Button>
                            )}
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

      {/* Override Dialog */}
      <Dialog open={overrideDialog.isOpen} onOpenChange={(v) => !v && setOverrideDialog({ isOpen: false, suggestionId: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Override Priority Suggestion</DialogTitle>
            <DialogDescription>
              Set a manual priority and due date. This will override the AI suggestion.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Final Priority *</label>
              <Select value={overridePriority} onValueChange={(v) => setOverridePriority(v as ClaimPriority)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Final Due Date (Optional)</label>
              <Input type="datetime-local" value={overrideDate} onChange={(e) => setOverrideDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason *</label>
              <Textarea 
                placeholder="Why are you overriding the AI suggestion?" 
                value={overrideReason} 
                onChange={(e) => setOverrideReason(e.target.value)} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOverrideDialog({ isOpen: false, suggestionId: null })} disabled={isActing}>Cancel</Button>
            <Button onClick={submitOverride} disabled={isActing || !overridePriority || !overrideReason}>Save Override</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialog.isOpen} onOpenChange={(v) => !v && setRejectDialog({ isOpen: false, suggestionId: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Priority Suggestion</DialogTitle>
            <DialogDescription>
              Rejecting will discard the AI recommendation. The claim will keep its original priority.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason *</label>
              <Textarea 
                placeholder="Why is this suggestion being rejected?" 
                value={rejectReason} 
                onChange={(e) => setRejectReason(e.target.value)} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog({ isOpen: false, suggestionId: null })} disabled={isActing}>Cancel</Button>
            <Button variant="destructive" onClick={submitReject} disabled={isActing || !rejectReason}>Confirm Rejection</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </motion.div>
  )
}
