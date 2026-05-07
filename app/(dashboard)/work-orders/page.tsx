"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { 
  ClipboardList, 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  MoreVertical,
  Calendar,
  User,
  Wrench
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  ResponsiveDataTable,
  Column
} from "@/components/ui/responsive-data-table"
import { useI18n } from "@/lib/i18n"
import { useAuth } from "@/lib/auth-context"
import { workOrdersApi } from "@/lib/api/work-orders"
import { equipmentApi } from "@/lib/api/equipment"
import type { WorkOrderResponse, EquipmentResponse } from "@/lib/api/types"
import { format, formatDistanceToNow } from "date-fns"
import { fr, enUS, ar } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { WorkOrderTypeBadge } from "@/components/work-order-type-badge"
import { StatusBadge } from "@/components/status-badge"
import { EquipmentSelector } from "@/components/equipment-selector"
import { translateEnum } from "@/lib/enum-mappers"

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 }
}

export default function WorkOrdersPage() {
  const { t, language } = useI18n()
  const isRtl = language === 'ar'
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth()
  const [workOrders, setWorkOrders] = useState<WorkOrderResponse[]>([])
  const [equipmentList, setEquipmentList] = useState<EquipmentResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [filter, setFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [showArchived, setShowArchived] = useState(false)

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 25

  useEffect(() => {
    setCurrentPage(1)
  }, [search, filter, showArchived])

  const dateLocale = language === 'fr' ? fr : language === 'ar' ? ar : enUS

  const [newWO, setNewWO] = useState({
    title: "",
    description: "",
    equipmentId: "",
    woType: "CORRECTIVE",
    priority: "MEDIUM",
    dueDate: ""
  })

  const loadData = async () => {
    if (!isAuthenticated) return
    setIsLoading(true)
    try {
      const [woData, eqData] = await Promise.all([
        workOrdersApi.list(),
        equipmentApi.getAll()
      ])
      setWorkOrders(woData)
      setEquipmentList(eqData)
    } catch (error) {
      console.error("Failed to load work orders", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      loadData()
    }
  }, [isAuthenticated, isAuthLoading])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await workOrdersApi.create({
        ...newWO,
        equipmentId: parseInt(newWO.equipmentId)
      })
      setIsDialogOpen(false)
      setNewWO({
        title: "",
        description: "",
        equipmentId: "",
        woType: "CORRECTIVE",
        priority: "MEDIUM",
        dueDate: ""
      })
      loadData()
    } catch (error) {
      console.error("Failed to create work order", error)
    }
  }

  const filteredOrders = useMemo(() => {
    return workOrders.filter(wo => {
      const q = search.toLowerCase()
      const matchesSearch = wo.title.toLowerCase().includes(q) || 
                           wo.woCode.toLowerCase().includes(q) ||
                           (wo.equipmentName?.toLowerCase().includes(q) ?? false)

      const f = filter.toLowerCase()
      if (f === "all") return matchesSearch
      
      if (f === "preventive" || f === "corrective" || f === "predictive") {
        return matchesSearch && wo.woType.toLowerCase() === f
      }

      return matchesSearch && wo.status.toLowerCase() === f
    })
  }, [workOrders, search, filter])

  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredOrders.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredOrders, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage)

  const columns: Column<WorkOrderResponse>[] = [
    { 
      header: t('code'), 
      accessor: (wo) => <span className="font-mono text-xs text-primary font-bold">{wo.woCode}</span>,
      rtlOrder: 1
    },
    { 
      header: t('title'), 
      accessor: (wo) => (
        <div className="max-w-xs">
          <div className="font-medium text-foreground truncate">{wo.title}</div>
          <div className="text-xs text-muted-foreground truncate">{wo.description}</div>
        </div>
      ),
      rtlOrder: 2
    },
    { 
      header: t('assignedTo'), 
      accessor: (wo) => (
        <div>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
              {wo.assignedToName?.split(' ').map(n => n[0]).join('') || '?'}
            </div>
            <span className="font-medium">{wo.assignedToName || t('unassigned')}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-muted-foreground truncate">
            <Wrench className="h-3 w-3" />
            <span>{wo.equipmentName}</span>
          </div>
        </div>
      ),
      rtlOrder: 3
    },
    { 
      header: t('duration'), 
      accessor: (wo) => (
        <div className="flex items-center gap-1 text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span>{wo.estimatedDuration || '—'}h</span>
        </div>
      ),
      rtlOrder: 4
    },
    { 
      header: t('type'), 
      accessor: (wo) => <WorkOrderTypeBadge type={wo.woType} size="sm" />,
      rtlOrder: 5
    },
    { 
      header: t('status'), 
      accessor: (wo) => (
        <div className="flex flex-col gap-1.5">
          <StatusBadge status={wo.status} />
          {wo.hasPendingAdHocTasks && (
            <Badge variant="outline" className="w-fit text-[9px] px-1.5 py-0 border-amber-300 text-amber-600 bg-amber-50/50 flex items-center gap-1">
              <AlertCircle className="h-2.5 w-2.5" />
              {t('reviewRequired')}
            </Badge>
          )}
        </div>
      ),
      rtlOrder: 6
    },
    { 
      header: t('updated'), 
      accessor: (wo) => (
        <div className="flex items-center gap-2 text-muted-foreground font-medium text-xs">
          <Calendar className="h-3.5 w-3.5 opacity-50" />
          <span>
            {wo.updatedAt 
              ? formatDistanceToNow(new Date(wo.updatedAt), { addSuffix: true, locale: dateLocale }) 
              : formatDistanceToNow(new Date(wo.createdAt), { addSuffix: true, locale: dateLocale })}
          </span>
        </div>
      ),
      rtlOrder: 7
    },
    { 
      header: t('actions'), 
      accessor: (wo) => (
        <Link href={`/work-orders/${wo.woId}`}>
          <Button variant="ghost" size="sm" className="h-8 p-2 text-primary hover:bg-primary/10 rounded-lg">
            {t('manage')}
          </Button>
        </Link>
      ),
      className: "text-right",
      rtlOrder: 0 // Move actions to start in RTL if desired, or keep at end
    }
  ]

  const renderMobileCard = (wo: WorkOrderResponse) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-primary font-bold">{wo.woCode}</span>
        <StatusBadge status={wo.status} />
      </div>
      <div>
        <h3 className="font-bold text-sm text-foreground">{wo.title}</h3>
        <p className="text-xs text-muted-foreground line-clamp-2">{wo.description}</p>
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-border/50">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center text-[8px] font-bold text-primary">
            {wo.assignedToName?.split(' ').map(n => n[0]).join('') || '?'}
          </div>
          <span className="text-[10px] font-medium">{wo.assignedToName || t('unassigned')}</span>
        </div>
        <WorkOrderTypeBadge type={wo.woType} size="sm" />
      </div>
      <Link href={`/work-orders/${wo.woId}`} className="block">
        <Button className="w-full h-8 text-xs bg-primary/10 text-primary hover:bg-primary/20 border-none shadow-none">
          {t('manage')}
        </Button>
      </Link>
    </div>
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-base font-semibold text-foreground">{t('workOrders')}</h1>
        <div className="flex gap-1.5">
          {!user?.hasRole('TECHNICIAN') && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-7 gap-1.5 bg-primary">
                  <Plus className="h-3 w-3" />
                  {t('newWorkOrder')}
                </Button>
              </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] bg-card/95 backdrop-blur-xl border-border shadow-2xl">
              <DialogHeader>
                <DialogTitle>{t('createMaintenanceIntervention')}</DialogTitle>
                <DialogDescription>
                  {t('fillDetailsGenerateWO')}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 py-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">{t('title')}</label>
                  <Input 
                    required 
                    placeholder="e.g., Annual MRI Inspection" 
                    value={newWO.title}
                    onChange={(e) => setNewWO({...newWO, title: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <EquipmentSelector
                    equipmentList={equipmentList}
                    value={newWO.equipmentId}
                    onChange={(val) => setNewWO({...newWO, equipmentId: val})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">{t('type')}</label>
                    <select 
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                      value={newWO.woType}
                      onChange={(e) => setNewWO({...newWO, woType: e.target.value})}
                    >
                      <option value="CORRECTIVE">{translateEnum('woType', 'CORRECTIVE', language)}</option>
                      <option value="PREVENTIVE">{translateEnum('woType', 'PREVENTIVE', language)}</option>
                      <option value="PREDICTIVE">{translateEnum('woType', 'PREDICTIVE', language)}</option>
                      <option value="REGULATORY">{translateEnum('woType', 'REGULATORY', language)}</option>
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">{t('priority')}</label>
                    <select 
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                      value={newWO.priority}
                      onChange={(e) => setNewWO({...newWO, priority: e.target.value})}
                    >
                      <option value="LOW">{translateEnum('priority', 'LOW', language)}</option>
                      <option value="MEDIUM">{translateEnum('priority', 'MEDIUM', language)}</option>
                      <option value="HIGH">{translateEnum('priority', 'HIGH', language)}</option>
                      <option value="CRITICAL">{translateEnum('priority', 'CRITICAL', language)}</option>
                    </select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">{t('description')}</label>
                  <textarea 
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder={t('brieflyDescribeTheIs')}
                    value={newWO.description}
                    onChange={(e) => setNewWO({...newWO, description: e.target.value})}
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>{t('cancel')}</Button>
                  <Button type="submit" className="bg-primary text-primary-foreground">{t('newWorkOrder')}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          )}
        </div>
      </div>
      <div className="grid gap-2 grid-cols-2 lg:grid-cols-4">
        {[
          { label: t('inProgress'), value: workOrders.filter(wo => wo.status === 'IN_PROGRESS').length, icon: Clock, color: "text-info", bg: "bg-info/10" },
          { label: t('created'), value: workOrders.filter(wo => wo.status === 'CREATED').length, icon: AlertCircle, color: "text-primary", bg: "bg-primary/10" },
          { label: t('completed'), value: workOrders.filter(wo => wo.status === 'COMPLETED').length, icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
          { label: t('urgent'), value: workOrders.filter(wo => wo.priority === 'CRITICAL').length, icon: AlertCircle, color: "text-destructive", bg: "bg-destructive/10" },
        ].map((stat, i) => (
          <Card key={i}>
            <CardContent className="flex items-center gap-2 p-2.5">
              <div className={`rounded p-1.5 ${stat.bg}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] text-muted-foreground uppercase truncate">{stat.label}</p>
                <p className="text-lg font-bold text-foreground">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className={cn("absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground", isRtl ? "right-2" : "left-2")} />
          <Input 
            placeholder={t('searchWorkOrders')} 
            className={cn("h-7 text-xs", isRtl ? "pr-7" : "pl-7")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setShowArchived(!showArchived)}
          className={cn("h-7 text-xs", showArchived && "bg-primary/10 border-primary text-primary")}
        >
          {showArchived ? t('hideArchived') : t('showArchived')}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
              <Filter className="h-3 w-3" />
              {filter === 'all' ? t('allStatuses') : translateEnum('status', filter, language)}
            </Button>
          </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-card/95 backdrop-blur-xl border-border">
              <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border/50 mb-1">{t('status')}</div>
              <DropdownMenuItem onClick={() => setFilter("all")}>{t('allStatuses')}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter("created")}>{translateEnum('status', 'CREATED', language)}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter("assigned")}>{translateEnum('status', 'ASSIGNED', language)}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter("in_progress")}>{translateEnum('status', 'IN_PROGRESS', language)}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter("completed")}>{translateEnum('status', 'COMPLETED', language)}</DropdownMenuItem>
              
              <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border/50 my-1">{t('type')}</div>
              <DropdownMenuItem onClick={() => setFilter("preventive")} className="gap-2">
                <WorkOrderTypeBadge type="PREVENTIVE" size="sm" />
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter("corrective")} className="gap-2">
                <WorkOrderTypeBadge type="CORRECTIVE" size="sm" />
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter("regulatory")} className="gap-2">
                <WorkOrderTypeBadge type="REGULATORY" size="sm" />
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter("predictive")} className="gap-2">
                <WorkOrderTypeBadge type="PREDICTIVE" size="sm" />
              </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Card>
        <CardContent className="p-0">
          <ResponsiveDataTable
            columns={columns}
            data={paginatedOrders}
            renderCard={renderMobileCard}
            isLoading={isLoading}
            emptyMessage={t('noWorkOrdersFound')}
            className="border-none"
          />
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t p-4">
              <p className="text-sm text-muted-foreground">
                {t('showing')} <span className="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span> {t('to')} <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredOrders.length)}</span> {t('of')} <span className="font-medium">{filteredOrders.length}</span> {t('results')}
              </p>
              <div className="flex flex-wrap gap-2 min-w-0">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                  {t('previous')}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                  {t('next')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
