"use client"

import { useState, useEffect } from "react"
import { useI18n } from "@/lib/i18n";
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  eachDayOfInterval,
  isToday,
  differenceInMinutes,
  addMinutes
} from "date-fns"
import { ChevronLeft, ChevronRight, Info, AlertCircle, Plus, CalendarPlus, User, Clock, MapPin, Hash } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import Link from "next/link"
import { EquipmentSelector } from "@/components/equipment-selector"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { workOrdersApi } from "@/lib/api/work-orders"
import { equipmentApi } from "@/lib/api/equipment"
import type { WorkOrderResponse, EquipmentResponse } from "@/lib/api/types"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function CalendarPage() {
  const { t } = useI18n();

  const [currentDate, setCurrentDate] = useState(new Date())
  const [workOrders, setWorkOrders] = useState<WorkOrderResponse[]>([])
  const [equipments, setEquipments] = useState<EquipmentResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const { toast } = useToast()

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [newWO, setNewWO] = useState({
    title: "",
    description: "",
    equipmentId: "",
    woType: "CORRECTIVE",
    priority: "MEDIUM"
  })

  useEffect(() => {
    const load = async () => {
      try {
        const [wos, eqs] = await Promise.all([
          workOrdersApi.list(),
          equipmentApi.getAll()
        ])
        setWorkOrders(wos)
        setEquipments(eqs)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(monthStart)
  const startDate = startOfWeek(monthStart)
  const endDate = endOfWeek(monthEnd)

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate })

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1))
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1))

  const getDayWos = (day: Date) => {
    return workOrders.filter(wo => {
      if (!wo.plannedStart && !wo.dueDate) return false
      const date = wo.plannedStart ? new Date(wo.plannedStart) : new Date(wo.dueDate!)
      return isSameDay(date, day)
    })
  }

  const handleDragStart = (e: React.DragEvent, woId: number) => {
    e.dataTransfer.setData("woId", woId.toString())
  }

  const handleDrop = async (e: React.DragEvent, targetDay: Date) => {
    e.preventDefault()
    const woId = parseInt(e.dataTransfer.getData("woId"))
    if (!woId) return

    const wo = workOrders.find(w => w.woId === woId)
    if (!wo) return

    const originalTime = wo.plannedStart ? wo.plannedStart.split('T')[1] : "09:00:00"
    const newPlannedStart = format(targetDay, "yyyy-MM-dd") + "T" + originalTime

    // Calculate time difference to shift other dates
    let newPlannedEnd = null
    let newDueDate = null

    if (wo.plannedStart) {
      const oldStart = new Date(wo.plannedStart)
      const newStart = new Date(newPlannedStart)
      
      if (!isNaN(oldStart.getTime()) && !isNaN(newStart.getTime())) {
        const diffMins = differenceInMinutes(newStart, oldStart)

        if (wo.plannedEnd) {
          const oldEnd = new Date(wo.plannedEnd)
          if (!isNaN(oldEnd.getTime())) {
            newPlannedEnd = format(addMinutes(oldEnd, diffMins), "yyyy-MM-dd'T'HH:mm:ss")
          }
        }
        
        if (wo.dueDate) {
          const oldDue = new Date(wo.dueDate)
          if (!isNaN(oldDue.getTime())) {
            newDueDate = format(addMinutes(oldDue, diffMins), "yyyy-MM-dd'T'HH:mm:ss")
          }
        } else {
          const hours = wo.estimatedDuration || wo.estimatedTimeHours || 0
          if (hours > 0) {
            newDueDate = format(addMinutes(newStart, hours * 60), "yyyy-MM-dd'T'HH:mm:ss")
          }
        }
      }
    } else {
      // If there was no plannedStart before, we just use targetDay for plannedEnd (if applicable)
      if (wo.plannedEnd) {
        newPlannedEnd = format(targetDay, "yyyy-MM-dd") + "T" + wo.plannedEnd.split('T')[1]
      }
      
      const newStart = new Date(newPlannedStart)
      
      if (wo.dueDate) {
         // Just move the due date day to match target day
         newDueDate = format(targetDay, "yyyy-MM-dd") + "T" + wo.dueDate.split('T')[1]
      } else {
         const hours = wo.estimatedDuration || wo.estimatedTimeHours || 0
         if (hours > 0 && !isNaN(newStart.getTime())) {
           newDueDate = format(addMinutes(newStart, hours * 60), "yyyy-MM-dd'T'HH:mm:ss")
         }
      }
    }

    setIsUpdating(true)
    // Optimistic update
    setWorkOrders(prev => prev.map(w => w.woId === woId ? { 
      ...w, 
      plannedStart: newPlannedStart,
      ...(newPlannedEnd && { plannedEnd: newPlannedEnd }),
      ...(newDueDate && { dueDate: newDueDate })
    } : w))

    try {
      await workOrdersApi.reschedule(woId, { 
        plannedStart: newPlannedStart,
        plannedEnd: newPlannedEnd,
        dueDate: newDueDate
      })
      toast({ title: "Updated", description: `Re-scheduled to ${format(targetDay, "MMM dd")}` })
    } catch (err) {
      console.error(err)
      toast({ title: "Failed", description: "Could not re-schedule work order", variant: "destructive" })
      // Rollback
      const refresh = await workOrdersApi.list()
      setWorkOrders(refresh)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDayClick = (day: Date) => {
    setSelectedDate(day)
    setNewWO(prev => ({ ...prev, title: "" })) // Reset title
    setIsCreateDialogOpen(true)
  }

  const handleCreateSubmit = async () => {
    if (!newWO.title || !newWO.equipmentId || !selectedDate) {
      toast({ title: "Validation Error", description: "Title and Equipment are required.", variant: "destructive" })
      return
    }

    setIsUpdating(true)
    try {
      const plannedStart = format(selectedDate, "yyyy-MM-dd") + "T09:00:00"
      await workOrdersApi.create({
        ...newWO,
        equipmentId: parseInt(newWO.equipmentId),
        plannedStart,
        status: 'SCHEDULED'
      })
      toast({ title: "Success", description: "Work Order created and scheduled." })
      setIsCreateDialogOpen(false)
      // Reload
      const updated = await workOrdersApi.list()
      setWorkOrders(updated)
    } catch (err) {
      console.error(err)
      toast({ title: "Error", description: "Failed to create work order", variant: "destructive" })
    } finally {
      setIsUpdating(false)
    }
  }

  if (loading) {
     return <div className="flex h-96 items-center justify-center text-muted-foreground animate-pulse">Initializing calendar...</div>
  }

  return (
    <>
    <Card className="shadow-xl border-border/40 overflow-hidden rounded-3xl">
      <CardHeader className="flex flex-row items-center justify-between bg-muted/20 border-b border-border/60 py-4">
        <div className="flex flex-col">
          <CardTitle className="text-xl font-bold bg-gradient-to-r from-primary to-indigo-600 bg-clip-text text-transparent">
            {format(currentDate, "MMMM yyyy")}
          </CardTitle>
          <div className="flex gap-4 mt-1">
             <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <div className="h-2 w-2 rounded-full bg-indigo-500" /> Planned
             </div>
             <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <div className="h-2 w-2 rounded-full bg-amber-500" /> Due Date
             </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())} className="h-8 rounded-lg">Today</Button>
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5 border">
            <Button variant="ghost" size="icon" onClick={prevMonth} className="h-8 w-8 hover:bg-white"><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8 hover:bg-white"><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
    </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-7 border-b border-border/60 bg-muted/5">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="p-3 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 auto-rows-[140px]">
          {calendarDays.map((day, idx) => {
            const dayWos = getDayWos(day)
            const isCurrentMonth = isSameMonth(day, monthStart)
            const isTodayDay = isToday(day)

            return (
              <div 
                key={idx} 
                className={cn(
                  "border-r border-b border-border/40 p-1 flex flex-col gap-1 transition-colors hover:bg-muted/5 group/day relative",
                  !isCurrentMonth && "bg-muted/10 opacity-40"
                )}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, day)}
                onClick={() => handleDayClick(day)}
              >
                <div className="flex justify-between p-1.5 items-start">
                  <span className={cn(
                    "text-xs font-semibold h-7 w-7 flex items-center justify-center rounded-full",
                    isTodayDay && "bg-primary text-primary-foreground shadow-md shadow-primary/30",
                    !isTodayDay && isCurrentMonth && "text-foreground",
                    !isTodayDay && !isCurrentMonth && "text-muted-foreground"
                  )}>
                    {format(day, "d")}
                  </span>
                  <div className="opacity-0 group-hover/day:opacity-100 transition-opacity">
                    <Plus className="h-4 w-4 text-primary cursor-pointer hover:scale-110" />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar px-1 space-y-1 z-10" onClick={(e) => e.stopPropagation()}>
                  {dayWos.map(wo => (
                    <div 
                      key={wo.woId}
                      draggable 
                      onDragStart={(e) => handleDragStart(e, wo.woId)}
                    >
                    <Link href={`/work-orders/${wo.woId}`}>
                      <div className={cn(
                         "text-[10px] p-1.5 rounded-lg border flex flex-col gap-0.5 shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98] cursor-move",
                         wo.status === 'COMPLETED' ? "bg-emerald-50 border-emerald-100 text-emerald-800" :
                         wo.status === 'IN_PROGRESS' ? "bg-amber-50 border-amber-100 text-amber-800" :
                         wo.plannedStart ? "bg-indigo-50 border-indigo-100 text-indigo-800" : "bg-zinc-50 border-zinc-200 text-zinc-800"
                      )}>
                        <div className="flex items-center justify-between">
                           <span className="font-bold tracking-tight">{wo.woCode}</span>
                           {wo.priority === 'CRITICAL' && <AlertCircle className="h-2 w-2 text-rose-500" />}
                        </div>
                        <span className="truncate opacity-90 leading-tight">{wo.title}</span>
                      </div>
                    </Link>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
      {/* ── CREATE WORK ORDER DIALOG ───────────────────────────── */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-card/95 backdrop-blur-xl border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle>Create Maintenance Intervention</DialogTitle>
            <DialogDescription>
              Fill in the details to generate a new work order for {selectedDate && format(selectedDate, "MMMM dd, yyyy")}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Title</label>
              <Input 
                required 
                placeholder="e.g., Annual MRI Inspection" 
                value={newWO.title}
                onChange={(e) => setNewWO({...newWO, title: e.target.value})}
              />
            </div>
            <div className="grid gap-2">
              <EquipmentSelector
                equipmentList={equipments}
                value={newWO.equipmentId}
                onChange={(val) => setNewWO({...newWO, equipmentId: val})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Type</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  value={newWO.woType}
                  onChange={(e) => setNewWO({...newWO, woType: e.target.value})}
                >
                  <option value="CORRECTIVE">Corrective</option>
                  <option value="PREVENTIVE">Preventive</option>
                  <option value="PREDICTIVE">Predictive</option>
                  <option value="REGULATORY">Regulatory</option>
                </select>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Priority</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  value={newWO.priority}
                  onChange={(e) => setNewWO({...newWO, priority: e.target.value})}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Description</label>
              <textarea 
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground"
                placeholder="Enter technical details..."
                value={newWO.description}
                onChange={(e) => setNewWO({...newWO, description: e.target.value})}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleCreateSubmit} 
                className="bg-primary text-primary-foreground"
                disabled={isUpdating}
              >
                {isUpdating ? "Creating..." : "Create Work Order"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
