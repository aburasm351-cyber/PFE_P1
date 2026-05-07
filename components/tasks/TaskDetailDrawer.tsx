"use client"

import { useState, useEffect } from "react"
import { 
  X, 
  Clock, 
  CheckSquare, 
  History, 
  MessageSquare, 
  AlertTriangle,
  Save,
  Play,
  CheckCircle2,
  Lock,
  Camera,
  Image as ImageIcon,
  Trash2,
  Timer,
  AlertCircle,
  Wrench,
  ChevronRight,
  Info,
  Calendar
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { 
  Sheet, 
  SheetContent, 
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { TaskResponse } from "@/lib/api/types"
import { tasksApi } from "@/lib/api/tasks"
import { TaskTimeline } from "./TaskTimeline"
import { format } from "date-fns"
import { motion, AnimatePresence } from "framer-motion"
import { getStatusColorVar } from "@/lib/colors-util"

interface TaskDetailDrawerProps {
  task: TaskResponse | null
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
}

export function TaskDetailDrawer({ task, isOpen, onClose, onUpdate }: TaskDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<'steps' | 'docs' | 'execution' | 'history'>('steps')
  const [actualDuration, setActualDuration] = useState("")
  const [notes, setNotes] = useState("")
  const [blockedReason, setBlockedReason] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [isReasonDialogOpen, setIsReasonDialogOpen] = useState(false)
  const [stopReason, setStopReason] = useState("")
  const [pendingStatus, setPendingStatus] = useState<string | null>(null)

  useEffect(() => {
    if (task) {
      setActualDuration(task.actualDuration?.toString() || "")
      setNotes(task.notes || "")
      setBlockedReason(task.blockedReason || "")
    }
  }, [task])

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (task?.status === 'IN_PROGRESS' && task.currentTimerStartedAt) {
      const startTime = new Date(task.currentTimerStartedAt).getTime();
      const baseSeconds = task.totalTimerDuration || 0;
      const updateTimer = () => {
        const now = new Date().getTime();
        const sessionSeconds = Math.floor((now - startTime) / 1000);
        setElapsedSeconds(baseSeconds + sessionSeconds);
      };
      updateTimer();
      interval = setInterval(updateTimer, 1000);
    } else if (task) {
      setElapsedSeconds(task.totalTimerDuration || 0);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [task?.status, task?.currentTimerStartedAt, task?.totalTimerDuration]);

  if (!task) return null

  const formatElapsedTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSaveDetails = async () => {
    try {
      setIsSaving(true)
      await tasksApi.update(task.taskId, {
        actualDuration: actualDuration ? parseFloat(actualDuration) : null,
        notes: notes,
        blockedReason: blockedReason
      })
      onUpdate()
    } catch (error) {
      console.error("Failed to save task details", error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleSubTask = async (subTaskId: number, completed: boolean) => {
    try {
      await tasksApi.toggleSubTask(subTaskId, completed)
      onUpdate()
    } catch (error) {
      console.error("Failed to toggle subtask", error)
    }
  }

  const handleUpdateStatus = async (status: string, reason?: string) => {
    try {
      // If stopping timer (moving away from IN_PROGRESS) and not finishing
      const isStopping = task.status === 'IN_PROGRESS' && !['DONE', 'PASS', 'FAIL'].includes(status)
      
      if (isStopping && !reason) {
        setPendingStatus(status)
        setIsReasonDialogOpen(true)
        return
      }

      if (status === 'BLOCKED' && !blockedReason && !reason) {
        setActiveTab('execution')
        alert("Please provide a blocking reason in the Execution Notes.")
        return
      }
      
      await tasksApi.updateStatus(task.taskId, status, reason)
      setIsReasonDialogOpen(false)
      setStopReason("")
      onUpdate()
    } catch (error) {
      console.error("Failed to update status", error)
    }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'BEFORE' | 'AFTER') => {
    const file = e.target.files?.[0]
    if (!file) return;
    try {
      setIsUploading(true);
      await tasksApi.uploadPhoto(task.taskId, file, type);
      onUpdate();
    } catch (error) {
      console.error("Photo upload failed", error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-2xl overflow-hidden p-0 flex flex-col">
        <SheetHeader className="p-6 border-b">
           <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <StatusBadge status={task.status} />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Lock className="h-3 w-3" /> WO-#{task.woId}
                  </span>
                </div>
                <SheetTitle className="text-xl font-bold tracking-tight">
                   {task.title || task.description}
                </SheetTitle>
              </div>
           </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto bg-muted/30">
          <div className="p-6 space-y-6">
            {/* KPIS */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-card p-4 rounded-xl border border-border space-y-3">
                 <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    <span>Progress</span>
                    <span className="text-primary">{Math.round(task.progress || 0)}%</span>
                 </div>
                 <Progress value={task.progress || 0} className="h-2" />
              </div>

              <div className={cn(
                "p-4 rounded-xl border flex flex-col justify-between h-20",
                task.status === 'IN_PROGRESS' ? 'bg-info text-info-foreground border-info shadow-lg shadow-info/20' : 'bg-card text-foreground border-border'
              )}>
                 <div className="flex justify-between items-center text-[10px] font-bold opacity-70 uppercase tracking-wider">
                    <span>Duration</span>
                    {task.status === 'IN_PROGRESS' && <Timer className="h-3 w-3 animate-spin" />}
                 </div>
                 <div className="flex items-end gap-2 leading-none">
                    <span className="text-2xl font-bold font-mono tracking-tighter">
                       {formatElapsedTime(elapsedSeconds)}
                    </span>
                    <span className="text-[10px] font-bold pb-1 opacity-60">HH:MM:SS</span>
                 </div>
              </div>
            </div>

            {/* TABS */}
            <div className="flex items-center gap-1 bg-muted p-1 rounded-xl">
               <button onClick={() => setActiveTab('steps')} className={cn("flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all", activeTab === 'steps' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                  <CheckSquare className="h-3.5 w-3.5" /> Steps
               </button>
               <button onClick={() => setActiveTab('docs')} className={cn("flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all", activeTab === 'docs' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                  <Camera className="h-3.5 w-3.5" /> Proof
               </button>
               <button onClick={() => setActiveTab('execution')} className={cn("flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all", activeTab === 'execution' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                  <MessageSquare className="h-3.5 w-3.5" /> Data
               </button>
               <button onClick={() => setActiveTab('history')} className={cn("flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all", activeTab === 'history' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                  <History className="h-3.5 w-3.5" /> Logs
               </button>
            </div>

            {/* CONTENT */}
            <AnimatePresence mode="wait">
              {activeTab === 'steps' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <div className="bg-card rounded-xl border border-border divide-y divide-border overflow-hidden">
                    {task.subTasks && task.subTasks.length > 0 ? (
                      task.subTasks.map(st => (
                        <div key={st.id} className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors">
                           <Checkbox 
                             id={`st-${st.id}`} 
                             checked={st.isCompleted} 
                             onCheckedChange={(checked) => handleToggleSubTask(st.id, !!checked)}
                           />
                           <label htmlFor={`st-${st.id}`} className={cn("text-sm font-medium transition-all cursor-pointer", st.isCompleted ? "text-muted-foreground line-through" : "text-foreground")}>
                              {st.description}
                           </label>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-muted-foreground italic text-sm">No checklist subtasks defined.</div>
                    )}
                  </div>

                  {task.childTasks && task.childTasks.length > 0 && (
                    <div className="space-y-2">
                       <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Derived Tasks</h4>
                       <div className="space-y-2">
                          {task.childTasks.map(ct => (
                            <div key={ct.taskId} className="bg-card p-3 rounded-lg border border-border flex items-center justify-between group cursor-pointer hover:border-primary/50 transition-colors">
                               <div className="flex flex-col">
                                 <span className="text-sm font-bold">{ct.title || ct.description}</span>
                                 <StatusBadge status={ct.status} />
                               </div>
                               <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                            </div>
                          ))}
                       </div>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'docs' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl flex gap-4">
                     <Info className="h-5 w-5 text-primary" />
                     <p className="text-xs text-muted-foreground leading-relaxed">Before and after visual documentation is required for specialized equipment maintenance auditing.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {(['BEFORE', 'AFTER'] as const).map(type => {
                       const photo = task.photos?.find(p => p.type === type)
                       return (
                         <div key={type} className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider ml-1">{type} Intervention</Label>
                            {photo ? (
                              <div className="relative group aspect-square rounded-xl overflow-hidden border border-border">
                                <img src={tasksApi.getPhotoUrl(task.taskId, photo.photoId)} alt={type} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                   <Button variant="secondary" size="sm">View</Button>
                                </div>
                              </div>
                            ) : (
                              <div className="aspect-square rounded-xl border-2 border-dashed border-border bg-muted/50 flex flex-col items-center justify-center gap-2 group relative cursor-pointer hover:border-primary/40 transition-colors">
                                 <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handlePhotoUpload(e, type)} disabled={isUploading} />
                                 {type === 'BEFORE' ? <ImageIcon className="h-6 w-6 text-muted-foreground" /> : <Camera className="h-6 w-6 text-muted-foreground" />}
                                 <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Upload</span>
                              </div>
                            )}
                         </div>
                       )
                    })}
                  </div>
                </motion.div>
              )}

              {activeTab === 'execution' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                         <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Estimated</Label>
                         <div className="bg-card p-3 rounded-xl border border-border font-mono font-bold text-sm">
                            {task.estimatedDuration || '--'} HRS
                         </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Actual (Manual)</Label>
                        <div className="relative">
                          <Input 
                            type="number" 
                            step="0.1" 
                            value={actualDuration} 
                            placeholder="1.5"
                            onChange={(e) => setActualDuration(e.target.value)}
                            className="h-10 bg-card border-border font-mono font-bold"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-bold">HRS</span>
                        </div>
                      </div>
                   </div>

                   <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Blocking Reason</Label>
                      <Input placeholder="None" value={blockedReason} onChange={(e) => setBlockedReason(e.target.value)} className="bg-card border-border" />
                   </div>

                   <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Technical Notes</Label>
                      <Textarea 
                        placeholder="Detail work performed..."
                        className="min-h-[150px] bg-card border-border resize-none"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                   </div>

                   <Button className="w-full h-11 font-bold uppercase tracking-widest text-xs" onClick={handleSaveDetails} disabled={isSaving}>
                     {isSaving ? <Timer className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                     Save Execution Data
                   </Button>
                </motion.div>
              )}

              {activeTab === 'history' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b">
                     <History className="h-4 w-4 text-muted-foreground" />
                     <h4 className="text-xs font-bold uppercase tracking-wider">Audit Log</h4>
                  </div>
                  <TaskTimeline logs={task.auditLogs || []} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-6 bg-background border-t flex items-center justify-between gap-4">
           <div className="flex items-center gap-2">
              {task.status !== 'IN_PROGRESS' && task.status !== 'DONE' && (
                <Button className="bg-info hover:bg-info/90 text-info-foreground font-bold" onClick={() => handleUpdateStatus('IN_PROGRESS')}>
                  <Play className="h-4 w-4 mr-2 fill-current" /> Start
                </Button>
              )}
              {task.status !== 'BLOCKED' && task.status !== 'DONE' && (
                <Button variant="outline" className="border-danger/30 text-danger hover:bg-danger/5 font-bold" onClick={() => handleUpdateStatus('BLOCKED')}>
                  <AlertCircle className="h-4 w-4 mr-2" /> Block
                </Button>
              )}
           </div>

           {task.status !== 'DONE' && (
             <Button className="bg-success hover:bg-success/90 text-success-foreground font-bold flex-1" onClick={() => handleUpdateStatus('DONE')}>
               <CheckCircle2 className="h-4 w-4 mr-2" /> Complete Step
             </Button>
           )}
        </div>
      </SheetContent>

      <Dialog open={isReasonDialogOpen} onOpenChange={setIsReasonDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-warning" />
              Stopping Task Timer
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="p-3 bg-muted rounded-lg text-xs text-muted-foreground leading-relaxed">
              You are stopping the active timer for this task. Please provide a brief explanation for auditing purposes.
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Reason for stopping</Label>
              <Textarea 
                id="reason"
                placeholder="e.g., Waiting for parts, End of shift, Blocked by other task..."
                value={stopReason}
                onChange={(e) => setStopReason(e.target.value)}
                className="min-h-[100px] resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReasonDialogOpen(false)}>Cancel</Button>
            <Button 
              className="bg-primary font-bold" 
              onClick={() => handleUpdateStatus(pendingStatus || 'TODO', stopReason)}
              disabled={!stopReason.trim()}
            >
              Confirm & Stop Timer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
  )
}

