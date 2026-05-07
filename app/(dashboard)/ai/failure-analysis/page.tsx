"use client"

import React, { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { 
  AlertTriangle, Search, Activity, FileText, Filter, 
  ChevronRight, Calendar, Building, ListFilter 
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

import { aiApi } from "@/lib/api/ai"
import { departmentsApi } from "@/lib/api/departments"
import type { 
  FailureAnalysisReportSummary,
  FailureAnalysisReportDetail,
  DepartmentResponse
} from "@/lib/api/types"

export default function FailureAnalysisPage() {
  // Filters State
  const [periodDays, setPeriodDays] = useState<string>("90")
  const [minClaims, setMinClaims] = useState<string>("3")
  const [minAffected, setMinAffected] = useState<string>("2")
  const [departmentId, setDepartmentId] = useState<string>("ALL")
  const [severity, setSeverity] = useState<string>("ALL")
  
  // Data State
  const [departments, setDepartments] = useState<DepartmentResponse[]>([])
  const [reports, setReports] = useState<FailureAnalysisReportSummary[]>([])
  const [isLoading, setIsLoading] = useState(false)
  
  // Detail State
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null)
  const [reportDetail, setReportDetail] = useState<FailureAnalysisReportDetail | null>(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)

  // Initial load
  useEffect(() => {
    loadDepartments()
  }, [])

  const loadDepartments = async () => {
    try {
      const data = await departmentsApi.getAll()
      setDepartments(data)
    } catch (error) {
      console.error("Failed to load departments:", error)
      toast.error("Failed to load departments")
    }
  }

  const handleGenerateReport = async () => {
    setIsLoading(true)
    setReports([])
    try {
      const params = {
        analysisPeriodDays: parseInt(periodDays, 10),
        minClaims: parseInt(minClaims, 10),
        minAffectedEquipment: parseInt(minAffected, 10),
        ...(departmentId !== "ALL" && { departmentId: parseInt(departmentId, 10) }),
        ...(severity !== "ALL" && { severity })
      }
      
      const data = await aiApi.getFailureAnalysisReports(params)
      setReports(data)
      
      if (data.length === 0) {
        toast.info("No suspicious patterns found matching these filters.")
      } else {
        toast.success(`Generated ${data.length} reports successfully.`)
      }
    } catch (error) {
      console.error("Failed to generate reports:", error)
      toast.error("Failed to generate reports")
      setReports([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetFilters = () => {
    setPeriodDays("90")
    setMinClaims("3")
    setMinAffected("2")
    setDepartmentId("ALL")
    setSeverity("ALL")
    setReports([])
    toast.info("Filters reset")
  }

  const handleViewDetails = async (reportId: string) => {
    setSelectedReportId(reportId)
    setReportDetail(null)
    setIsDetailOpen(true)
    setIsDetailLoading(true)
    
    try {
      const params = {
        analysisPeriodDays: parseInt(periodDays, 10),
        minClaims: parseInt(minClaims, 10),
        minAffectedEquipment: parseInt(minAffected, 10),
        ...(departmentId !== "ALL" && { departmentId: parseInt(departmentId, 10) }),
        ...(severity !== "ALL" && { severity })
      }
      
      const detail = await aiApi.getFailureAnalysisReportDetail(reportId, params)
      setReportDetail(detail)
    } catch (error) {
      console.error("Failed to load report details:", error)
      toast.error("Failed to load report details")
      setIsDetailOpen(false)
    } finally {
      setIsDetailLoading(false)
    }
  }

  // Calculate summary metrics
  const totalOpenClaims = reports.reduce((acc, r) => acc + r.claimCount, 0)
  const highestSeverity = reports.some(r => r.severity === 'CRITICAL') ? 'CRITICAL' :
                         reports.some(r => r.severity === 'HIGH') ? 'HIGH' :
                         reports.some(r => r.severity === 'MEDIUM') ? 'MEDIUM' :
                         reports.some(r => r.severity === 'LOW') ? 'LOW' : 'NONE'
                         
  const totalAffected = reports.reduce((acc, r) => acc + r.affectedEquipmentCount, 0)

  const getSeverityColor = (sev: string) => {
    switch(sev) {
      case 'CRITICAL': return 'bg-red-500/10 text-red-700 hover:bg-red-500/20'
      case 'HIGH': return 'bg-orange-500/10 text-orange-700 hover:bg-orange-500/20'
      case 'MEDIUM': return 'bg-yellow-500/10 text-yellow-700 hover:bg-yellow-500/20'
      case 'LOW': return 'bg-blue-500/10 text-blue-700 hover:bg-blue-500/20'
      default: return 'bg-slate-100 text-slate-700'
    }
  }

  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null) return '-'
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      
      {/* Header */}
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="h-8 w-8 text-primary" />
            Failure Analysis
          </h2>
          <p className="text-muted-foreground mt-1">
            Structured reports for unusual equipment claim and maintenance patterns.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            
            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1.5 text-slate-600">
                <Calendar className="h-4 w-4" /> Period
              </label>
              <Select value={periodDays} onValueChange={setPeriodDays}>
                <SelectTrigger>
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="180">Last 6 months</SelectItem>
                  <SelectItem value="365">Last 1 year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1.5 text-slate-600">
                <Building className="h-4 w-4" /> Department
              </label>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger>
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Departments</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept.departmentId} value={dept.departmentId.toString()}>
                      {dept.departmentName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1.5 text-slate-600">
                <Filter className="h-4 w-4" /> Min Claims
              </label>
              <Input 
                type="number" 
                min="1" 
                value={minClaims} 
                onChange={(e) => setMinClaims(e.target.value)} 
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1.5 text-slate-600">
                <ListFilter className="h-4 w-4" /> Min Affected Equip
              </label>
              <Input 
                type="number" 
                min="1" 
                value={minAffected} 
                onChange={(e) => setMinAffected(e.target.value)} 
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button 
                className="w-full" 
                onClick={handleGenerateReport}
                disabled={isLoading}
              >
                <Search className="mr-2 h-4 w-4" />
                {isLoading ? "Analyzing..." : "Generate Reports"}
              </Button>
              <Button 
                variant="outline"
                className="w-full" 
                onClick={handleResetFilters}
                disabled={isLoading}
              >
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suspicious Patterns</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reports.length}</div>
            <p className="text-xs text-muted-foreground">Found in last {periodDays} days</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Affected Equipment</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAffected}</div>
            <p className="text-xs text-muted-foreground">Across all patterns</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Claims Involved</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOpenClaims}</div>
            <p className="text-xs text-muted-foreground">Driving these reports</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Highest Severity</CardTitle>
            <AlertTriangle className={cn("h-4 w-4", highestSeverity === 'CRITICAL' ? 'text-red-500' : 'text-muted-foreground')} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {highestSeverity === 'NONE' ? '-' : highestSeverity}
            </div>
            <p className="text-xs text-muted-foreground">Based on baseline multiplier</p>
          </CardContent>
        </Card>
      </div>

      {/* Report List */}
      <Card>
        <CardHeader>
          <CardTitle>Analysis Reports</CardTitle>
          <CardDescription>
            Evidence-based findings showing unusual claim concentrations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <Search className="h-16 w-16 text-slate-200 dark:text-slate-800 mb-4" />
              <p className="text-lg font-semibold text-slate-400">No failure patterns detected</p>
              <p className="text-sm mt-1 max-w-xs text-center">Your data currently shows no abnormal claim concentrations based on your filter criteria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reports.map((report) => (
                <div 
                  key={report.id} 
                  onClick={() => handleViewDetails(report.id)}
                  className="group relative flex flex-col p-6 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:shadow-xl hover:shadow-violet-500/5 hover:border-violet-200 dark:hover:border-violet-500/30 transition-all cursor-pointer overflow-hidden"
                >
                  <div className="flex items-center justify-between mb-4">
                    <Badge className={cn("px-2 py-0.5 rounded-md font-bold text-[10px] tracking-tight", getSeverityColor(report.severity))} variant="secondary">
                      {report.severity}
                    </Badge>
                    <Badge variant="outline" className="bg-slate-50 dark:bg-slate-800/50 text-[10px] border-slate-100 dark:border-slate-700">
                      {report.scopeLabel}
                    </Badge>
                  </div>
                  
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2 line-clamp-1 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                    {report.title}
                  </h3>
                  
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-6 font-medium leading-relaxed">
                    {report.mainFinding}
                  </p>
                  
                  <div className="mt-auto pt-4 border-t border-slate-50 dark:border-slate-800/50 flex items-center justify-between">
                    <div className="flex gap-4">
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Claims</span>
                        <span className="text-sm font-black dark:text-white">{report.claimCount}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Assets</span>
                        <span className="text-sm font-black dark:text-white">{report.affectedEquipmentCount}</span>
                      </div>
                    </div>
                    
                    <div className="h-8 w-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-violet-600 group-hover:text-white transition-all">
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Sheet */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent className="w-[400px] sm:w-[650px] md:w-[900px] sm:max-w-none p-0 overflow-hidden flex flex-col" side="right">
          {isDetailLoading ? (
            <>
              <SheetHeader className="sr-only">
                <SheetTitle>Loading Report Details</SheetTitle>
              </SheetHeader>
              <div className="flex flex-1 items-center justify-center">
                <div className="flex flex-col items-center text-slate-500">
                  <Search className="h-10 w-10 animate-pulse mb-4 text-violet-500" />
                  <p className="font-medium">Synthesizing failure evidence...</p>
                </div>
              </div>
            </>
          ) : reportDetail ? (
            <div className="flex flex-col h-full overflow-y-auto">
              <div className="p-8 sm:p-10 space-y-8">
                <SheetHeader className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Badge className={cn("px-2 py-0.5 rounded-md font-bold tracking-tight", getSeverityColor(reportDetail.severity))} variant="secondary">
                      {reportDetail.severity}
                    </Badge>
                    <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
                    <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                      {reportDetail.scope.departmentName}
                    </span>
                  </div>
                  <SheetTitle className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                    {reportDetail.title}
                  </SheetTitle>
                  <SheetDescription className="text-slate-500 dark:text-slate-400 font-medium">
                    Diagnostic generated on {new Date(reportDetail.summary.generatedAt).toLocaleDateString()} at {new Date(reportDetail.summary.generatedAt).toLocaleTimeString()}
                  </SheetDescription>
                </SheetHeader>

                {/* Core Findings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="rounded-2xl border border-orange-100 dark:border-orange-900/30 bg-orange-50/50 dark:bg-orange-950/10 p-6 shadow-sm">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-orange-600 dark:text-orange-400 flex items-center gap-2 mb-3">
                      <AlertTriangle className="h-4 w-4" />
                      Core Findings
                    </h4>
                    <p className="text-base text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                      {reportDetail.summary.mainFinding}
                    </p>
                  </div>
                  
                  <div className="rounded-2xl border border-blue-100 dark:border-blue-900/30 bg-blue-50/50 dark:bg-blue-950/10 p-6 shadow-sm">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 flex items-center gap-2 mb-3">
                      <Activity className="h-4 w-4" />
                      Maintenance Impact
                    </h4>
                    <p className="text-base text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                      {reportDetail.summary.businessSignal}
                    </p>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                  <div className="border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm bg-white dark:bg-slate-900/50">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Affected Assets</div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white">
                      {reportDetail.metrics.affectedEquipmentCount} <span className="text-slate-300 dark:text-slate-600 font-normal">/ {reportDetail.metrics.equipmentCount}</span>
                    </div>
                  </div>
                  <div className="border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm bg-white dark:bg-slate-900/50">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Total Claims</div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white">{reportDetail.metrics.claimCount}</div>
                    {reportDetail.metrics.openClaimCount > 0 && (
                      <div className="text-[10px] text-orange-600 font-bold mt-1 bg-orange-50 dark:bg-orange-950/30 px-1.5 py-0.5 rounded w-fit">{reportDetail.metrics.openClaimCount} ACTIVE</div>
                    )}
                  </div>
                  
                  {reportDetail.metrics.totalActualCost !== undefined && reportDetail.metrics.totalActualCost > 0 && (
                    <div className="border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm bg-white dark:bg-slate-900/50">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Direct Cost</div>
                      <div className="text-2xl font-black text-slate-900 dark:text-white">{formatCurrency(reportDetail.metrics.totalActualCost)}</div>
                    </div>
                  )}
                  {reportDetail.metrics.partUsageCount !== undefined && reportDetail.metrics.partUsageCount > 0 && (
                    <div className="border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm bg-white dark:bg-slate-900/50">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Part Count</div>
                      <div className="text-2xl font-black text-slate-900 dark:text-white">{reportDetail.metrics.partUsageCount} units</div>
                    </div>
                  )}
                  {reportDetail.metrics.underRepairRatio !== undefined && reportDetail.metrics.underRepairRatio > 0 && (
                    <div className="border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm bg-white dark:bg-slate-900/50">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Availability Risk</div>
                      <div className="text-2xl font-black text-rose-600 dark:text-rose-400">{(reportDetail.metrics.underRepairRatio * 100).toFixed(1)}%</div>
                    </div>
                  )}
                  {reportDetail.metrics.conversionRate !== undefined && reportDetail.metrics.conversionRate > 0 && (
                    <div className="border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm bg-white dark:bg-slate-900/50">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">WO Rate</div>
                      <div className="text-2xl font-black text-violet-600 dark:text-violet-400">{(reportDetail.metrics.conversionRate * 100).toFixed(0)}%</div>
                    </div>
                  )}
                  {reportDetail.metrics.daysToFirstClaim !== undefined && (
                    <div className="border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm bg-white dark:bg-slate-900/50">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Days to Fail</div>
                      <div className="text-2xl font-black text-slate-900 dark:text-white">{reportDetail.metrics.daysToFirstClaim}</div>
                    </div>
                  )}
                  {reportDetail.metrics.warrantyEndDate && (
                    <div className="border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm bg-white dark:bg-slate-900/50 col-span-2">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center justify-between">
                        Warranty Expiration
                        {reportDetail.metrics.daysBeforeWarrantyEnd !== undefined && (
                          <Badge variant="outline" className="text-[10px] font-bold border-orange-200 text-orange-700 bg-orange-50 dark:bg-orange-950/20">{reportDetail.metrics.daysBeforeWarrantyEnd} DAYS LEFT</Badge>
                        )}
                      </div>
                      <div className="text-2xl font-black text-slate-900 dark:text-white">{formatDate(reportDetail.metrics.warrantyEndDate)}</div>
                    </div>
                  )}
                </div>

                {/* Explanation */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <Search className="h-4 w-4" /> Supporting Evidence
                  </h4>
                  <div className="grid grid-cols-1 gap-2">
                    {reportDetail.detectionExplanation.map((expl, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 text-sm text-slate-600 dark:text-slate-400">
                        <div className="h-5 w-5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                          {i + 1}
                        </div>
                        {expl}
                      </div>
                    ))}
                  </div>
                </div>

                <Tabs defaultValue="equipment" className="w-full">
                  <TabsList className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl w-fit">
                    <TabsTrigger value="equipment" className="rounded-lg font-bold text-xs px-4">Assets</TabsTrigger>
                    <TabsTrigger value="claims" className="rounded-lg font-bold text-xs px-4">Claims</TabsTrigger>
                    <TabsTrigger value="workorders" className="rounded-lg font-bold text-xs px-4">Orders</TabsTrigger>
                    <TabsTrigger value="timeline" className="rounded-lg font-bold text-xs px-4">Timeline</TabsTrigger>
                  </TabsList>
                
                  <TabsContent value="equipment" className="mt-4 border rounded-md p-0 overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead>Asset</TableHead>
                          <TableHead>Mfg</TableHead>
                          <TableHead className="text-right">Claims</TableHead>
                          <TableHead className="text-right">WOs</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportDetail.affectedEquipment.map((eq) => (
                          <TableRow key={eq.equipmentId}>
                            <TableCell className="font-medium text-xs">
                              {eq.assetCode}
                              <div className="text-muted-foreground">{eq.name}</div>
                            </TableCell>
                            <TableCell className="text-xs">{eq.manufacturer || '-'}</TableCell>
                            <TableCell className="text-right text-xs">
                              {eq.claimCount} <span className="text-orange-500">({eq.openClaimCount} open)</span>
                            </TableCell>
                            <TableCell className="text-right text-xs">{eq.workOrderCount}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TabsContent>
                  
                  <TabsContent value="claims" className="mt-4 border rounded-md p-0 overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead>Claim</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportDetail.claims.map((c) => (
                          <TableRow key={c.claimId}>
                            <TableCell className="font-medium text-xs">
                              {c.claimCode}
                              <div className="text-muted-foreground">{c.equipmentName}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px]">{c.status}</Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {new Date(c.createdAt).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TabsContent>
                  
                  <TabsContent value="workorders" className="mt-4 border rounded-md p-0 overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead>Work Order</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Cost</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportDetail.workOrders && reportDetail.workOrders.length > 0 ? (
                          reportDetail.workOrders.map((wo) => (
                            <TableRow key={wo.workOrderId}>
                              <TableCell className="font-medium text-xs">
                                {wo.workOrderCode}
                                <div className="text-muted-foreground">{new Date(wo.createdAt).toLocaleDateString()}</div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-[10px]">{wo.status}</Badge>
                              </TableCell>
                              <TableCell className="text-xs">{wo.type}</TableCell>
                              <TableCell className="text-right text-xs font-medium">
                                {formatCurrency(wo.actualCost)}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-4 text-muted-foreground text-xs">
                              No linked work orders found.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TabsContent>
                  
                  <TabsContent value="timeline" className="mt-4 border rounded-md p-4">
                    <div className="space-y-4">
                      {reportDetail.timeline.map((event, i) => (
                        <div key={i} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className="h-2 w-2 rounded-full bg-slate-400 mt-1.5" />
                            {i < reportDetail.timeline.length - 1 && <div className="h-full w-px bg-slate-200 mt-1" />}
                          </div>
                          <div className="pb-4">
                            <p className="text-xs text-muted-foreground mb-0.5">
                              {new Date(event.date).toLocaleString()}
                            </p>
                            <p className="text-sm font-medium">{event.label}</p>
                            <Badge variant="secondary" className="mt-1 text-[10px] bg-slate-100">{event.eventType}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-slate-500">
              Report not found
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
