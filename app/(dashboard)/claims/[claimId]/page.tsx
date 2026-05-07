"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { AlertTriangle, ArrowLeft, Pencil, Wrench, CheckCircle, UserPlus, XCircle, Activity, Check, Edit2, X, Zap } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { claimsApi } from "@/lib/api/claims"
import { usersApi } from "@/lib/api/users"
import { workOrdersApi } from "@/lib/api/work-orders"
import type { ClaimPhotoResponse, ClaimResponse, UserResponse, WorkOrderResponse } from "@/lib/api/types"
import { ApiError } from "@/lib/api/client"
import { useI18n } from "@/lib/i18n"
import { useAuth } from "@/lib/auth-context"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { aiApi } from "@/lib/api/ai"
import type { PrioritySuggestionResponse, ClaimPriority } from "@/lib/api/types"
import { toast } from "sonner"
import { WorkOrderLifecycleFlow } from "@/components/work-orders/WorkOrderLifecycleFlow"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"

function getPriorityColor(priority: string) {
  switch (priority.toLowerCase()) {
    case "critical":
      return "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
    case "high":
      return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
    case "medium":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
    default:
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
  }
}

function getStatusColor(status: string) {
  switch (normalizeStatusLabel(status)) {
    case "open":
    case "new":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
    case "qualified":
      return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
    case "assigned":
      return "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
    case "in progress":
      return "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400"
    case "converted to work order":
      return "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400"
    case "resolved":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
    case "closed":
      return "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400"
    case "rejected":
      return "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
    default:
      return "bg-muted text-muted-foreground"
  }
}

function normalizeLabel(value: string) {
  return value.replaceAll("_", " ").trim()
}

function normalizeStatusLabel(value: string) {
  const normalized = normalizeLabel(value).toLowerCase()
  if (normalized === "qualified") return "open"
  return normalized
}

function toDisplayStatusLabel(value: string) {
  const normalized = normalizeStatusLabel(value)
  return normalized.replace(/\b\w/g, (m) => m.toUpperCase())
}

export default function ClaimDetailsPage() {
  const { t, language } = useI18n()
  const { user } = useAuth()
  const params = useParams<{ claimId: string }>()
  const claimId = Number(params?.claimId)

  const [claim, setClaim] = useState<ClaimResponse | null>(null)
  const [photos, setPhotos] = useState<ClaimPhotoResponse[]>([])
  const [technicians, setTechnicians] = useState<UserResponse[]>([])
  const [linkedWo, setLinkedWo] = useState<WorkOrderResponse | null>(null)
  const photoUrlRef = useRef<Record<number, string>>({})
  const [photoUrls, setPhotoUrls] = useState<Record<number, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [photosError, setPhotosError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isPhotosLoading, setIsPhotosLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState<number | null>(null)
  
  // Workflow states
  const [isConverting, setIsConverting] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [qualifyNotes, setQualifyNotes] = useState("")
  const [qualifyDueDate, setQualifyDueDate] = useState("")
  const [qualifySeverity, setQualifySeverity] = useState("")
  const [assignUserId, setAssignUserId] = useState<string>("")

  // AI Prioritization states
  const [suggestion, setSuggestion] = useState<PrioritySuggestionResponse | null>(null)
  const [isCalculatingAI, setIsCalculatingAI] = useState(false)
  
  // Dialog States for AI
  const [isOverrideOpen, setIsOverrideOpen] = useState(false)
  const [isRejectOpen, setIsRejectOpen] = useState(false)
  
  // Form States for AI Actions
  const [overridePriority, setOverridePriority] = useState<ClaimPriority>("MEDIUM")
  const [overrideDueDate, setOverrideDueDate] = useState("")
  const [actionReason, setActionReason] = useState("")


  useEffect(() => {
    if (!Number.isFinite(claimId)) {
      setError(t('invalidClaimID'))
      setIsLoading(false)
      return
    }

    let cancelled = false
    const load = async () => {
      setIsLoading(true)
      setIsPhotosLoading(true)
      setError(null)
      setPhotosError(null)
      try {
        const claimRes = await claimsApi.getById(claimId)
        if (!cancelled) {
          setClaim(claimRes)
          if (claimRes.reportedSeverity) {
            setQualifySeverity(claimRes.reportedSeverity)
          }
        }
        
        if (claimRes.linkedWoId) {
          try {
            const woRes = await workOrdersApi.getById(claimRes.linkedWoId)
            if (!cancelled) setLinkedWo(woRes)
          } catch (e) {
            console.error("Failed to fetch linked WO", e)
          }
        }

        const techs = await usersApi.getAll()
        if (!cancelled) setTechnicians(techs.filter(t => t.roleName === 'TECHNICIAN' || t.roleId === 3))
      } catch (err) {
        if (cancelled) return
        if (err instanceof ApiError) {
          setError(`Request failed (${err.status})`)
        } else {
          setError(t('failedToLoad'))
        }
      }

      try {
        const photosRes = await claimsApi.listPhotos(claimId)
        if (!cancelled) setPhotos(photosRes)
      } catch (err) {
        if (cancelled) return
        if (err instanceof ApiError) {
          setPhotosError(`Request failed (${err.status})`)
        } else {
          setPhotosError(t('failedToLoad'))
        }
        setPhotos([])
      } finally {
        if (!cancelled) setIsLoading(false)
        if (!cancelled) setIsPhotosLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [claimId, language])

  const priorityLabel = useMemo(() => {
    if (!claim) return ""
    return claim.priorityLabel ?? normalizeLabel(String(claim.priority ?? ""))
  }, [claim])

  const statusLabel = useMemo(() => {
    if (!claim) return ""
    const raw = claim.statusLabel ?? normalizeLabel(String(claim.status ?? ""))
    return toDisplayStatusLabel(raw)
  }, [claim])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      if (photos.length === 0) {
        Object.values(photoUrlRef.current).forEach((url) => URL.revokeObjectURL(url))
        photoUrlRef.current = {}
        setPhotoUrls({})
        return
      }

      const nextUrls: Record<number, string> = {}
      for (const photo of photos) {
        try {
          const blob = await claimsApi.getPhotoBlob(claimId, photo.photoId)
          if (cancelled) return
          nextUrls[photo.photoId] = URL.createObjectURL(blob)
        } catch {
          // Skip preview if download fails.
        }
      }

      if (cancelled) return
      Object.values(photoUrlRef.current).forEach((url) => URL.revokeObjectURL(url))
      photoUrlRef.current = nextUrls
      setPhotoUrls(nextUrls)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [claimId, photos])

  useEffect(() => {
    return () => {
      Object.values(photoUrlRef.current).forEach((url) => URL.revokeObjectURL(url))
      photoUrlRef.current = {}
    }
  }, [])

  const handleDeletePhoto = async (photoId: number) => {
    if (!claim) return
    setIsDeleting(photoId)
    try {
      await claimsApi.deletePhoto(claim.claimId, photoId)
      setPhotos((prev) => prev.filter((p) => p.photoId !== photoId))
      const current = photoUrlRef.current
      if (current[photoId]) {
        URL.revokeObjectURL(current[photoId])
        const { [photoId]: _removed, ...rest } = current
        photoUrlRef.current = rest
        setPhotoUrls(rest)
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`Request failed (${err.status})`)
        return
      }
      setError(t('failedToDelete'))
    } finally {
      setIsDeleting(null)
    }
  }

  const handleConvert = async () => {
    if (!claim) return
    setIsConverting(true)
    try {
      await claimsApi.convertToWorkOrder(claim.claimId)
      const claimRes = await claimsApi.getById(claimId)
      setClaim(claimRes)
    } catch (err) {
      setError(t('conversionFailed'))
    } finally {
      setIsConverting(false)
    }
  }

  const handleQualify = async () => {
    if (!claim) return
    setActionLoading("qualify")
    try {
      const payload: any = { 
        qualificationNotes: qualifyNotes,
        validatedSeverity: qualifySeverity || undefined
      }
      if (qualifyDueDate) {
        payload.dueDate = new Date(qualifyDueDate).toISOString()
      }
      await claimsApi.qualify(claim.claimId, payload)
      const claimRes = await claimsApi.getById(claimId)
      setClaim(claimRes)
      setQualifyDueDate("")
      setQualifyNotes("")
      setQualifySeverity("")
      
      // Reload suggestion
      loadSuggestion()
    } catch (err) {
      setError(t('qualificationFailed'))
    } finally {
      setActionLoading(null)
    }
  }

  const loadSuggestion = async () => {
    try {
      const res = await aiApi.getSuggestionByClaimId(claimId)
      setSuggestion(res)
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        // Expected if no suggestion exists yet
        setSuggestion(null)
      } else {
        console.error("Failed to load AI suggestion", e)
        setSuggestion(null)
      }
    }
  }

  // Load suggestion after initial claim load
  useEffect(() => {
    if (claimId && user && (user.roleName === 'ADMIN' || user.roleName === 'MAINTENANCE_MANAGER')) {
      loadSuggestion()
    }
  }, [claimId, user])

  const handleCalculateAI = async () => {
    setIsCalculatingAI(true)
    try {
      const res = await aiApi.calculateClaimPriority(claimId)
      setSuggestion(res)
      toast.success("Priority analyzed successfully")
    } catch (e) {
      toast.error("Failed to analyze priority")
    } finally {
      setIsCalculatingAI(false)
    }
  }

  const handleAcceptAI = async () => {
    if (!suggestion) return
    try {
      const res = await aiApi.acceptPrioritySuggestion(suggestion.id)
      setSuggestion(res)
      toast.success("Suggestion accepted. Claim updated.")
      const claimRes = await claimsApi.getById(claimId)
      setClaim(claimRes)
    } catch (e) {
      toast.error("Failed to accept suggestion")
    }
  }

  const handleOverrideAI = async () => {
    if (!suggestion || !actionReason) return
    try {
      const payload: any = { finalPriority: overridePriority, reason: actionReason }
      if (overrideDueDate) {
        payload.finalDueDate = new Date(overrideDueDate).toISOString()
      }
      const res = await aiApi.overridePrioritySuggestion(suggestion.id, payload)
      setSuggestion(res)
      setIsOverrideOpen(false)
      setActionReason("")
      setOverrideDueDate("")
      toast.success("Priority overridden. Claim updated.")
      const claimRes = await claimsApi.getById(claimId)
      setClaim(claimRes)
    } catch (e) {
      toast.error("Failed to override priority")
    }
  }

  const handleRejectAI = async () => {
    if (!suggestion || !actionReason) return
    try {
      const res = await aiApi.rejectPrioritySuggestion(suggestion.id, { reason: actionReason })
      setSuggestion(res)
      setIsRejectOpen(false)
      setActionReason("")
      toast.success("Suggestion rejected.")
    } catch (e) {
      toast.error("Failed to reject suggestion")
    }
  }

  const handleAssign = async () => {
    if (!claim || !assignUserId) return
    setActionLoading("assign")
    try {
      await claimsApi.assign(claim.claimId, { assignedToUserId: parseInt(assignUserId) })
      const claimRes = await claimsApi.getById(claimId)
      setClaim(claimRes)
    } catch (err) {
      setError(language === "fr" ? "Échec de l'assignation" : "Assignment failed")
    } finally {
      setActionLoading(null)
    }
  }

  const handleClose = async () => {
    if (!claim) return
    setActionLoading("close")
    try {
      await claimsApi.updateStatus(claim.claimId, { status: "CLOSED", note: "Manually closed via ui." })
      const claimRes = await claimsApi.getById(claimId)
      setClaim(claimRes)
    } catch (err) {
      setError(t('closureFailed'))
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/claims">
            <Button variant="ghost" size="icon" type="button">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
              {t('claimDetails')}
            </h1>
            <p className="text-muted-foreground">
              {claim?.claimCode ?? ""}
            </p>
          </div>
        </div>
        {claim && (
          <div className="flex flex-wrap items-center gap-2">
            
            {/* LINKED WO */}
            {claim.linkedWoId && (
              <Link href={`/work-orders/${claim.linkedWoId}`}>
                <Button variant="outline" className="gap-2 border-primary/50 text-primary">
                   <Wrench className="h-4 w-4" />
                   {t('viewLinkedWO')}
                </Button>
              </Link>
            )}

            {(user?.roleName === 'ADMIN' || user?.roleName === 'MAINTENANCE_MANAGER') && (
              <>
                {/* QUALIFY */}
                {claim.status === 'NEW' && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="gap-2 text-indigo-600 border-indigo-200">
                         <CheckCircle className="h-4 w-4" />
                         {t('qualify')}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Qualify Claim</DialogTitle></DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Validated Severity *</label>
                          <select 
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" 
                            value={qualifySeverity} 
                            onChange={(e) => setQualifySeverity(e.target.value)}
                            required
                          >
                            <option value="">Select severity...</option>
                            <option value="SAFETY_RISK">Safety Risk</option>
                            <option value="SERVICE_BLOCKING">Service Blocking</option>
                            <option value="DEGRADED_PERFORMANCE">Degraded Performance</option>
                            <option value="MINOR_DEFECT">Minor Defect</option>
                            <option value="COSMETIC_OR_INFO">Cosmetic or Info</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Due date (Optional)</label>
                          <Input 
                            type="datetime-local" 
                            value={qualifyDueDate} 
                            onChange={(e) => setQualifyDueDate(e.target.value)} 
                          />
                        </div>
                        <Textarea 
                          placeholder="Resolution or qualification notes..." 
                          value={qualifyNotes} 
                          onChange={e => setQualifyNotes(e.target.value)} 
                        />
                      </div>
                      <DialogFooter>
                         <Button onClick={handleQualify} disabled={actionLoading === "qualify"}>Confirm Qualification</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
                
                {/* ASSIGN button removed as per request - now inherited through WO conversion */}


                {/* CONVERT */}
                {['QUALIFIED', 'ASSIGNED'].includes(claim.status ?? "") && !claim.linkedWoId && (
                  <Button 
                    variant="outline" 
                    className="gap-2 border-primary/50 text-primary hover:bg-primary/10" 
                    onClick={handleConvert}
                    disabled={isConverting}
                  >
                    <Wrench className={`h-4 w-4 ${isConverting ? 'animate-spin' : ''}`} />
                    {t('convertToWO')}
                  </Button>
                )}

                {/* CLOSE */}
                {!['CLOSED', 'REJECTED', 'RESOLVED'].includes(claim.status ?? "") && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="gap-2 text-rose-600 border-rose-200">
                         <XCircle className="h-4 w-4" />
                         {t('close')}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Close Claim</DialogTitle></DialogHeader>
                      <p className="text-sm text-muted-foreground">Are you sure you want to forcibly close this claim?</p>
                      <DialogFooter>
                         <Button variant="destructive" onClick={handleClose} disabled={actionLoading === "close"}>
                           {actionLoading === "close" ? "Closing..." : "Close Claim"}
                         </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </>
            )}
            
            <Link href={`/claims/${claim.claimId}/edit`}>
              <Button className="gap-2" type="button">
                <Pencil className="h-4 w-4" />
                {t('edit')}
              </Button>
            </Link>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            {t('summary')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">
              {t('loading')}
            </p>
          ) : claim ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t('title')}
                </p>
                <p className="font-medium text-foreground">{claim.title}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {t('equipment')}
                </p>
                <p className="font-medium text-foreground">
                  {claim.equipmentName ?? `#${claim.equipmentId}`}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {t('priority')}
                </p>
                <Badge variant="outline" className={getPriorityColor(priorityLabel)}>
                  {priorityLabel}
               </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {t('status')}
                </p>
                <Badge variant="outline" className={getStatusColor(statusLabel)}>
                  {statusLabel}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {t('department')}
                </p>
                <p className="font-medium text-foreground">{claim.departmentName ?? "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {t('assignedTech')}
                </p>
                <p className="font-medium text-foreground">{claim.assignedToName ?? "-"}</p>
              </div>
              {claim.dueDate && (
                <div>
                  <p className="text-sm text-muted-foreground">Due Date</p>
                  <p className="font-medium text-foreground">{new Date(claim.dueDate).toLocaleDateString()}</p>
                </div>
              )}
              {claim.reportedSeverity && (
                <div>
                  <p className="text-sm text-muted-foreground">Reported Severity</p>
                  <p className="font-medium text-foreground">{claim.reportedSeverity.replace('_', ' ')}</p>
                </div>
              )}
              {claim.validatedSeverity && (
                <div>
                  <p className="text-sm text-muted-foreground">Validated Severity</p>
                  <p className="font-medium text-foreground text-indigo-600">{claim.validatedSeverity.replace('_', ' ')}</p>
                </div>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {user && (user.roleName === 'ADMIN' || user.roleName === 'MAINTENANCE_MANAGER') && (
        <Card className="border-indigo-100 shadow-sm overflow-hidden">
          <div className="h-1 bg-indigo-600 w-full" />
          <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-indigo-900">
                <Zap className="h-5 w-5 text-indigo-500" />
                Automatic Prioritization
              </CardTitle>
              {suggestion ? (
                <div className="flex gap-2">
                  {suggestion.decisionStatus === "PENDING" && (
                    <>
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 h-8 text-xs" onClick={handleAcceptAI}>
                        <Check className="h-3 w-3 mr-1" /> Accept
                      </Button>
                      <Button size="sm" variant="outline" className="border-amber-200 text-amber-700 bg-amber-50 h-8 text-xs hover:bg-amber-100" onClick={() => setIsOverrideOpen(true)}>
                        <Edit2 className="h-3 w-3 mr-1" /> Override
                      </Button>
                      <Button size="sm" variant="outline" className="border-rose-200 text-rose-700 bg-rose-50 h-8 text-xs hover:bg-rose-100" onClick={() => setIsRejectOpen(true)}>
                        <X className="h-3 w-3 mr-1" /> Reject
                      </Button>
                    </>
                  )}
                  {suggestion.decisionStatus !== "PENDING" && (
                    <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                      {suggestion.decisionStatus}
                    </Badge>
                  )}
                </div>
              ) : (
                <Button size="sm" variant="outline" className="border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100" onClick={handleCalculateAI} disabled={isCalculatingAI}>
                  {isCalculatingAI ? <Activity className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
                  {isCalculatingAI ? "Analyzing..." : "Calculate AI Priority"}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {suggestion ? (
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Suggested Priority</p>
                      <Badge className={getPriorityColor(suggestion.suggestedPriority)} variant="outline">
                        {suggestion.suggestedPriority}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">AI Score</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold">{suggestion.score}</span>
                        <span className="text-xs text-muted-foreground">/ 100</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">SLA Status</p>
                      <Badge variant="secondary" className={
                        suggestion.slaStatus === 'BREACHED' ? 'bg-rose-100 text-rose-700' : 
                        suggestion.slaStatus === 'AT_RISK' ? 'bg-amber-100 text-amber-700' : 
                        suggestion.slaStatus === 'SAFE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                      }>
                        {suggestion.slaStatus.replace('_', ' ')}
                      </Badge>
                    </div>
                    {suggestion.suggestedDueDate && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Suggested Due Date</p>
                        <span className="text-sm font-medium">{new Date(suggestion.suggestedDueDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    <div className="col-span-2 mt-2">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2">Score Breakdown</p>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                        <div className="flex justify-between items-center border-b border-border/40 pb-1">
                          <span>Criticality (30%)</span>
                          <span className="font-medium">{suggestion.criticalityScore}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-border/40 pb-1">
                          <span>Service Impact (25%)</span>
                          <span className="font-medium">{suggestion.serviceImpactScore}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-border/40 pb-1">
                          <span>Severity (20%)</span>
                          <span className="font-medium">{suggestion.severityScore}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-border/40 pb-1">
                          <span>Failure Hist. (15%)</span>
                          <span className="font-medium">{suggestion.failureHistoryScore}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-border/40 pb-1">
                          <span>Age/SLA (10%)</span>
                          <span className="font-medium">{suggestion.slaScore}</span>
                        </div>
                        <div className="flex justify-between items-center pt-1 font-bold text-indigo-600">
                          <span>Final Total</span>
                          <span>{suggestion.score}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-4 border-l border-border/50 pl-6">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Reasoning</p>
                    <p className="text-sm bg-muted/30 p-3 rounded-lg border border-border/40 text-foreground/80">
                      {suggestion.reason}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Recommendation</p>
                    <p className="text-sm text-indigo-700 dark:text-indigo-400 font-medium">
                      {suggestion.recommendation}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="bg-indigo-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Zap className="h-6 w-6 text-indigo-400" />
                </div>
                <p className="text-sm text-muted-foreground">No AI priority analysis exists for this claim yet.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={isOverrideOpen} onOpenChange={setIsOverrideOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Override AI Suggestion</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">New Priority</label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={overridePriority} onChange={(e) => setOverridePriority(e.target.value as ClaimPriority)}>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">New Due Date (Optional)</label>
              <Input type="datetime-local" value={overrideDueDate} onChange={(e) => setOverrideDueDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason for Override <span className="text-rose-500">*</span></label>
              <Textarea placeholder="Required justification..." value={actionReason} onChange={(e) => setActionReason(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOverrideOpen(false)}>Cancel</Button>
            <Button onClick={handleOverrideAI} disabled={!actionReason}>Confirm Override</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject AI Suggestion</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">This will discard the AI's suggestion without altering the claim.</p>
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason for Rejection <span className="text-rose-500">*</span></label>
              <Textarea placeholder="Required justification..." value={actionReason} onChange={(e) => setActionReason(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleRejectAI} disabled={!actionReason}>Reject Suggestion</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {linkedWo && (
        <Card className="border-indigo-100 shadow-xl overflow-hidden">
          <div className="h-1 bg-indigo-600 w-full" />
          <CardHeader className="bg-muted/50 border-b border-border/50">
            <CardTitle className="flex justify-between items-center text-sm uppercase tracking-widest text-indigo-900">
              <span>Conversion Work Order Status</span>
              <Badge variant="outline" className="border-indigo-200 text-indigo-700 bg-card">WO-{linkedWo.woId}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-6">
            <WorkOrderLifecycleFlow status={linkedWo.status} />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
         <Card>
           <CardHeader>
             <CardTitle>{t('description')}</CardTitle>
           </CardHeader>
           <CardContent>
             {claim ? (
               <p className="text-sm text-muted-foreground whitespace-pre-wrap">{claim.description}</p>
             ) : (
               <p className="text-sm text-muted-foreground">-</p>
             )}
           </CardContent>
         </Card>

         <Card>
           <CardHeader>
             <CardTitle>{t('processingNotes')}</CardTitle>
           </CardHeader>
           <CardContent>
             {claim?.qualificationNotes || claim?.rejectionNotes ? (
               <div className="space-y-4">
                  {claim.qualificationNotes && (
                    <div>
                       <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Qualify Notes</span>
                       <p className="text-sm border-l-2 border-indigo-500 pl-3 py-1 bg-muted/30">{claim.qualificationNotes}</p>
                    </div>
                  )}
                  {claim.rejectionNotes && (
                    <div>
                       <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Reject Notes</span>
                       <p className="text-sm border-l-2 border-rose-500 pl-3 py-1 bg-muted/30">{claim.rejectionNotes}</p>
                    </div>
                  )}
               </div>
             ) : (
               <p className="text-sm text-muted-foreground italic">No processing notes yet.</p>
             )}
           </CardContent>
         </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('photos')}</CardTitle>
        </CardHeader>
        <CardContent>
          {photosError && <p className="text-sm text-destructive">{photosError}</p>}
          {isPhotosLoading ? (
            <p className="text-sm text-muted-foreground">
              {t('loading')}
            </p>
          ) : photos.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {photos.map((photo) => {
                const src = photoUrls[photo.photoId]
                const label = photo.originalName ?? `Photo #${photo.photoId}`
                return (
                  <div key={photo.photoId} className="rounded-lg border border-border overflow-hidden">
                    <div className="aspect-video bg-muted">
                      {src ? (
                        <img
                          src={src}
                          alt={label}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                          {t('previewUnavailable')}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 px-3 py-2">
                      <p className="truncate text-xs text-muted-foreground">{label}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        disabled={isDeleting === photo.photoId}
                        onClick={() => handleDeletePhoto(photo.photoId)}
                      >
                        {t('delete')}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t('noPhotos')}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
