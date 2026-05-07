"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { useI18n } from "@/lib/i18n";
import {
  ArrowLeft, Clock, CheckSquare, History, MessageSquare, AlertTriangle, Save,
  Play, CheckCircle2, Lock, Camera, Image as ImageIcon, Timer, AlertCircle,
  Wrench, ChevronRight, Calendar, User, Briefcase, FileText, Activity,
  CheckCheck, XCircle, PauseCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { StatusBadge } from "@/components/status-badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { tasksApi } from "@/lib/api/tasks"
import { TaskResponse } from "@/lib/api/types"
import { format } from "date-fns"
import { TaskTimeline } from "@/components/tasks/TaskTimeline"
import { useAuth } from "@/lib/auth-context"
import { AuthenticatedImage } from "@/components/ui/authenticated-image"
import { cn } from "@/lib/utils"

type Tab = 'steps' | 'docs' | 'data' | 'history'

export default function TaskDetailPage() {
  const { t } = useI18n();

  const router = useRouter()
  const params = useParams<{ taskId: string }>()
  const taskId = Number(params?.taskId)
  const { user } = useAuth()

  const [task, setTask] = useState<TaskResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [notes, setNotes] = useState("")
  const [actualDuration, setActualDuration] = useState("")
  const [blockedReason, setBlockedReason] = useState("")
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null)

  const loadTask = async () => {
    try {
      const data = await tasksApi.getById(taskId)
      setTask(data)
      setNotes(data.notes || "")
      setActualDuration(data.actualDuration?.toString() || "")
      setBlockedReason(data.blockedReason || "")
    } catch (e) {
      console.error("Failed to load task", e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (taskId) loadTask()
  }, [taskId])

  // Live timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (task?.status === 'IN_PROGRESS' && task.currentTimerStartedAt) {
      const startTime = new Date(task.currentTimerStartedAt).getTime()
      const base = task.totalTimerDuration || 0
      const tick = () => setElapsedSeconds(base + Math.floor((Date.now() - startTime) / 1000))
      tick()
      interval = setInterval(tick, 1000)
    } else if (task) {
      setElapsedSeconds(task.totalTimerDuration || 0)
    }
    return () => { if (interval) clearInterval(interval) }
  }, [task?.status, task?.currentTimerStartedAt, task?.totalTimerDuration])

  const fmt = (s: number) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
  }

  const handleStatus = async (status: string) => {
    console.log("Task action triggered:", status, "taskId:", task?.taskId)
    if (!task) return
    try {
      setIsSaving(true)
      await tasksApi.updateStatus(task.taskId, status)
      await loadTask()
    } catch (e) { 
      console.error("Task action failed:", e) 
    } finally { 
      setIsSaving(false) 
    }
  }

  const handleSave = async () => {
    if (!task) return
    try {
      setIsSaving(true)
      await tasksApi.update(task.taskId, { notes, actualDuration: actualDuration ? parseFloat(actualDuration) : null, blockedReason })
      await loadTask()
    } catch (e) { console.error(e) } finally { setIsSaving(false) }
  }

  const handleToggleSub = async (subId: number, completed: boolean) => {
    try {
      await tasksApi.toggleSubTask(subId, completed)
      await loadTask()
    } catch (e) { console.error(e) }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'BEFORE' | 'AFTER') => {
    const file = e.target.files?.[0]
    if (!file || !task) return
    try {
      setIsUploading(true)
      await tasksApi.uploadPhoto(task.taskId, file, type)
      await loadTask()
    } catch (e) { console.error(e) } finally { setIsUploading(false) }
  }

  const handlePhotoDelete = async (photoId: number) => {
    if (!task) return
    try {
      setIsUploading(true)
      await tasksApi.deletePhoto(task.taskId, photoId)
      await loadTask()
    } catch (e) { console.error(e) } finally { setIsUploading(false) }
  }

  const handleApproval = async (status: 'APPROVED' | 'REJECTED') => {
    if (!task) return
    try {
      setIsSaving(true)
      await tasksApi.approve(task.taskId, status)
      await loadTask()
    } catch (e) { console.error(e) } finally { setIsSaving(false) }
  }

  const handleReplanRequest = async (reason: string) => {
    if (!task || !reason) return
    try {
      setIsSaving(true)
      await tasksApi.replanRequest(task.taskId, reason)
      await loadTask()
      setBlockedReason("")
    } catch (e) { console.error(e) } finally { setIsSaving(false) }
  }

  const handleApproveReplan = async (status: 'APPROVED' | 'REJECTED') => {
    if (!task) return
    try {
      setIsSaving(true)
      await tasksApi.approveReplan(task.taskId, status)
      await loadTask()
    } catch (e) { console.error(e) } finally { setIsSaving(false) }
  }

  const handleDirectReplan = async (reason?: string) => {
    if (!task) return
    try {
      setIsSaving(true)
      await tasksApi.replan(task.taskId, reason)
      await loadTask()
    } catch (e) { console.error(e) } finally { setIsSaving(false) }
  }

  const statusConfig = (s: string) => {
    switch (s?.toUpperCase()) {
      case 'DONE': case 'PASS': return { color: 'bg-emerald-600', label: 'Completed', icon: <CheckCircle2 className="h-4 w-4" /> }
      case 'IN_PROGRESS': return { color: 'bg-blue-600', label: 'Executing', icon: <Timer className="h-4 w-4" /> }
      case 'BLOCKED': return { color: 'bg-rose-600', label: 'Blocked', icon: <AlertTriangle className="h-4 w-4" /> }
      case 'FAIL': return { color: 'bg-rose-500', label: 'Failed', icon: <XCircle className="h-4 w-4" /> }
      default: return { color: 'bg-slate-500', label: 'Pending', icon: <Clock className="h-4 w-4" /> }
    }
  }

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 font-medium text-sm">Loading task details...</p>
      </div>
    </div>
  )

  if (!task) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <p className="text-rose-500 font-semibold">Task not found.</p>
    </div>
  )

  const cfg = statusConfig(task.status)
  const isDone = task.status === 'DONE' || task.status === 'PASS'
  const isPendingApproval = task.approvalStatus === 'PENDING'
  const isReplanRequested = task.approvalStatus === 'REPLAN_REQUESTED'
  const isInProgress = task.status === 'IN_PROGRESS'
  const isManager = user?.hasRole('ADMIN', 'MAINTENANCE_MANAGER')
  const isTechnician = user?.hasRole('TECHNICIAN')

  const getPhotoForType = (type: 'BEFORE' | 'AFTER') => {
    return task.photos?.find(p => p.type === type)
  }

  return (
    <div className="space-y-6">
      {/* TOP HEADER: BREADCRUMBS & TITLE & TIMER */}
      <div className="flex items-start justify-between">
        <div className="space-y-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/tasks" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Task Center</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href={`/work-orders/${task.woId}`} className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">WO-#{task.woId}</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="text-[10px] font-bold uppercase tracking-widest text-foreground">{task.title || task.description}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-black text-foreground">{task.title || task.description}</h1>
              <Badge variant="outline" className="bg-muted text-[10px] font-bold uppercase tracking-widest border-none">TO DO</Badge>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              <span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" />{task.assignedToName || 'Unassigned'}</span>
              <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />{task.dueDate ? format(new Date(task.dueDate), 'MMM d, yyyy') : '--'}</span>
              <span className="flex items-center gap-1.5"><Wrench className="h-3.5 w-3.5" />{task.priority} Priority</span>
              {task.isAdHoc && <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-[8px] font-black uppercase">AD-HOC</Badge>}
            </div>
          </div>
        </div>

        {/* TIMER CARD (Top Right) */}
        <Card className="w-64 bg-muted/30 border-border/60 shadow-sm">
          <CardContent className="p-3 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground">Active Timer</span>
              <span className="text-3xl font-black font-mono leading-none">{fmt(elapsedSeconds)}</span>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className={cn("h-10 w-10 rounded-full border border-border bg-background shadow-sm", isInProgress && "text-blue-600 animate-pulse")}
              onClick={() => handleStatus(isInProgress ? 'TODO' : 'IN_PROGRESS')}
              disabled={isSaving}
            >
              {isInProgress ? <PauseCircle className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* KPI GRID: 5 Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Progress', value: `${Math.round(task.progress || 0)}%`, sub: '' },
          { label: 'Est. Duration', value: task.estimatedDuration || '0', sub: 'HRS' },
          { label: 'Checklist', value: `${task.subTasks?.filter(s => s.isCompleted).length ?? 0} / ${task.subTasks?.length ?? 0}`, sub: '' },
          { label: 'Priority', value: task.priority || 'MEDIUM', sub: '' },
          { label: 'Type', value: task.isAdHoc ? 'Ad-Hoc' : 'Standard', sub: '' },
        ].map((kpi, i) => (
          <Card key={i} className="bg-card border-border shadow-sm">
            <CardContent className="p-4 space-y-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{kpi.label}</p>
              <p className="text-2xl font-black text-foreground">
                {kpi.value} {kpi.sub && <span className="text-xs font-bold text-muted-foreground">{kpi.sub}</span>}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ACTIONS ROW */}
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          {!isDone && (
            <>
              {!isInProgress ? (
                <Button 
                  onClick={() => handleStatus('IN_PROGRESS')} 
                  disabled={isSaving}
                  className="h-11 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase text-[10px] tracking-widest rounded-xl gap-2 shadow-lg shadow-primary/20 transition-all"
                >
                  <Play className="h-4 w-4 fill-current" /> Start Timer
                </Button>
              ) : (
                <Button 
                  onClick={() => handleStatus('TODO')} 
                  disabled={isSaving}
                  className="h-11 px-6 bg-amber-600 hover:bg-amber-700 text-white font-black uppercase text-[10px] tracking-widest rounded-xl gap-2 shadow-lg shadow-amber-600/20"
                >
                  <PauseCircle className="h-4 w-4" /> Stop Timer
                </Button>
              )}
              
              <Button 
                variant="outline" 
                onClick={() => handleStatus('BLOCKED')} 
                disabled={isSaving}
                className="h-11 px-6 border-destructive/20 text-destructive hover:bg-destructive/5 hover:border-destructive/30 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2"
              >
                <AlertCircle className="h-4 w-4" /> Block
              </Button>

              {isManager && (
                <Button 
                  variant="outline" 
                  onClick={() => handleDirectReplan()} 
                  disabled={isSaving}
                  className="h-11 px-6 border-primary/20 text-primary hover:bg-primary/5 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2"
                >
                  <History className="h-4 w-4" /> Replan Task
                </Button>
              )}

              {isTechnician && task.status === 'BLOCKED' && (
                <Button 
                  variant="outline" 
                  onClick={() => handleReplanRequest(blockedReason || "Technical constraint")} 
                  disabled={isSaving}
                  className="h-11 px-6 border-amber-500 text-amber-600 hover:bg-amber-50 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2"
                >
                  <AlertTriangle className="h-4 w-4" /> Request Replan
                </Button>
              )}
            </>
          )}
        </div>
        {!isDone && (
          <Button 
            onClick={() => handleStatus('DONE')} 
            disabled={isSaving}
            className="h-11 px-8 bg-success hover:bg-success/90 text-success-foreground font-black uppercase text-[10px] tracking-widest rounded-xl gap-2 shadow-lg shadow-success/10"
          >
            <CheckCircle2 className="h-4 w-4" /> Mark Complete
          </Button>
        )}
      </div>

      {/* MIDDLE SECTION: INSTRUCTIONS & CHECKLIST (2/3) vs OBSERVATIONS (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-card border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Task Instructions</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground leading-relaxed">{task.description || 'No instructions provided.'}</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border shadow-sm overflow-hidden">
            <CardHeader className="pb-4 bg-muted/30 border-b border-border/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-primary" />
                  <CardTitle className="text-xs uppercase tracking-widest font-black text-foreground">Procedural Checklist</CardTitle>
                </div>
                <Badge variant="secondary" className="bg-muted text-muted-foreground border-none font-bold text-[9px] uppercase">
                  {task.subTasks?.filter(s => s.isCompleted).length ?? 0}/{task.subTasks?.length ?? 0} STEPS
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-12 text-center">
               <p className="text-sm text-muted-foreground italic">No checklist defined for this procedure.</p>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="bg-card border-border shadow-sm">
            <CardHeader className="pb-4 border-b border-border/40">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <CardTitle className="text-xs uppercase tracking-widest font-black text-foreground">Field Observations</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Blocking Factor</Label>
                <Input value={blockedReason} onChange={e => setBlockedReason(e.target.value)} placeholder="No obstacles reported" className="bg-muted/20 border-border rounded-xl h-12 text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Technical Notes</Label>
                <textarea 
                  className="w-full min-h-[200px] bg-muted/20 border border-border rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Describe findings, part replacements, or adjustments..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Duration Override (HRS)</Label>
                <div className="relative">
                  <Input value={actualDuration} onChange={e => setActualDuration(e.target.value)} placeholder="Actual hrs" className="bg-muted/20 border-border rounded-xl h-12 text-sm pr-12 font-bold" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-primary">HRS</span>
                </div>
              </div>
              <Button onClick={handleSave} className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase text-[10px] tracking-widest rounded-xl gap-2 shadow-lg shadow-primary/10">
                <Save className="h-4 w-4" /> Commit Record
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* LOWER SECTION: EXECUTION PROOF */}
      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="pb-4 border-b border-border/40">
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-primary" />
            <CardTitle className="text-xs uppercase tracking-widest font-black text-foreground">Execution Proof</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 gap-6">
            {(['BEFORE', 'AFTER'] as const).map(type => {
              const photo = getPhotoForType(type)
              return (
                <div key={type} className="space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{type === 'BEFORE' ? 'Pre-Execution' : 'Post-Execution'}</p>
                  <div 
                    className="aspect-[21/9] rounded-2xl border-2 border-dashed border-border bg-muted/10 flex flex-col items-center justify-center gap-3 transition-all hover:bg-muted/20 group cursor-pointer relative overflow-hidden"
                    onClick={() => {
                      if (photo) {
                        setPreviewImage({ 
                          url: `/tasks/${task.taskId}/photos/${photo.photoId}/download`, 
                          title: `${type === 'BEFORE' ? 'Pre' : 'Post'}-Execution Proof` 
                        })
                      }
                    }}
                  >
                    {photo ? (
                      <>
                        <AuthenticatedImage 
                          path={`/tasks/${task.taskId}/photos/${photo.photoId}/download`}
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 cursor-zoom-in"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                          <Button 
                            variant="destructive" 
                            size="icon" 
                            className="h-10 w-10 rounded-full"
                            onClick={(e) => {
                              e.stopPropagation()
                              handlePhotoDelete(photo.photoId)
                            }}
                            disabled={isUploading}
                          >
                            <XCircle className="h-5 w-5" />
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="h-12 w-12 rounded-full bg-background shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                          {isUploading ? (
                            <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Camera className="h-6 w-6 text-muted-foreground/40" />
                          )}
                        </div>
                        <p className="text-xs font-bold text-muted-foreground">{isUploading ? 'Uploading...' : 'Click to upload proof'}</p>
                        <input 
                          type="file" 
                          className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed" 
                          onChange={e => handlePhotoUpload(e, type)} 
                          accept="image/*" 
                          disabled={isUploading || isDone}
                        />
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* BOTTOM SECTION: ACTIVITY LOG */}
      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="pb-4 border-b border-border/40">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            <CardTitle className="text-xs uppercase tracking-widest font-black text-foreground">Activity Log</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6">
           <TaskTimeline logs={task.auditLogs || []} />
        </CardContent>
      </Card>
      {/* Image Preview Lightbox */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 overflow-hidden bg-black/95 border-none">
          <DialogHeader className="absolute top-4 left-4 z-10">
            <DialogTitle className="text-white bg-black/50 px-3 py-1 rounded-lg backdrop-blur-sm border border-white/10 uppercase text-[10px] font-black tracking-widest">
              {previewImage?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center w-full h-full min-h-[50vh]">
            {previewImage && (
              <AuthenticatedImage 
                path={previewImage.url} 
                className="max-w-full max-h-[85vh] object-contain shadow-2xl" 
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
