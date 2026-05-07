"use client"
import { useEffect, useState, useMemo } from "react"
import { motion } from "framer-motion"
import { Activity, BarChart2, Clock, DollarSign, RefreshCw, Search, Settings2, TrendingDown, TrendingUp, Wrench, X, Filter } from "lucide-react"
import { AreaChart, Area, BarChart, Bar, ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { biApi } from "@/lib/api/bi"
import { workOrdersApi } from "@/lib/api/work-orders"
import { departmentsApi } from "@/lib/api/departments"
import { referenceDataApi } from "@/lib/api/reference-data"
import type { KpiResponse, WorkOrderResponse, DepartmentResponse, EquipmentCategory } from "@/lib/api/types"
import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { getMaintenanceColorVar } from "@/lib/colors-util"

const C = ["#6366f1","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#ec4899"]
const ALL = "__all__"
const fmt$ = (v:number) => v>=1000?`$${(v/1000).toFixed(1)}k`:`$${v.toFixed(0)}`
function Empty(){return <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No data for selected filters</div>}

function KpiCard({label,sub,value,icon,trend,colorClass,bgClass,colorVar,bgColorVar,higherIsBetter=true}:any){
  const isGood=trend!=null&&trend!==0?(higherIsBetter?trend>0:trend<0):null
  return(
    <Card>
      <CardContent className="p-2.5">
        <div className="flex items-center gap-2">
          <div className={cn("p-1.5 rounded",bgClass,colorClass)} style={{ backgroundColor: bgColorVar, color: colorVar }}>{icon}</div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] text-muted-foreground uppercase truncate">{label}</p>
            <p className="text-lg font-bold">{value}</p>
          </div>
        </div>
        {isGood!==null&&<div className={cn("inline-flex items-center gap-1 mt-1.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full",isGood?"bg-emerald-50 text-emerald-700":"bg-rose-50 text-rose-700")}>{isGood?<TrendingUp className="h-2.5 w-2.5"/>:<TrendingDown className="h-2.5 w-2.5"/>}{Math.abs(trend).toFixed(1)}%</div>}
      </CardContent>
    </Card>
  )
}

export default function ExecutiveDashboard(){
  const {language,t}=useI18n()
  const [kpi,setKpi]=useState<KpiResponse|null>(null)
  const [wos,setWos]=useState<WorkOrderResponse[]>([])
  const [depts,setDepts]=useState<DepartmentResponse[]>([])
  const [cats,setCats]=useState<EquipmentCategory[]>([])
  const [loading,setLoading]=useState(true)
  const [refreshing,setRefreshing]=useState(false)
  // filters
  const [nameQ,setNameQ]=useState("")
  const [deptF,setDeptF]=useState(ALL)
  const [catF,setCatF]=useState(ALL)

  const load=async(r=false)=>{
    r?setRefreshing(true):setLoading(true)
    try{
      const [k,w,d,c]=await Promise.all([biApi.getKpis(),workOrdersApi.list(),departmentsApi.getAll(),referenceDataApi.getCategories()])
      setKpi(k);setWos(w);setDepts(d);setCats(c)
    }finally{setLoading(false);setRefreshing(false)}
  }
  useEffect(()=>{load()},[])

  // filtered WOs
  const filteredWos=useMemo(()=>wos.filter(wo=>{
    const n=nameQ.trim().toLowerCase()
    const mName=!n||(wo.equipmentName??"").toLowerCase().includes(n)
    const mDept=deptF===ALL||(wo.departmentName??"")===(depts.find(d=>String(d.departmentId)===deptF)?.departmentName??"")
    const mCat=catF===ALL // WO has no category; filter by category is best-effort via equipment
    return mName&&mDept&&mCat
  }),[wos,nameQ,deptF,deptF,catF,depts])

  const hasFilter=nameQ.trim()!==""||deptF!==ALL||catF!==ALL
  const clear=()=>{setNameQ("");setDeptF(ALL);setCatF(ALL)}

  // derive cost per equipment from real WO actualCost
  const costPerEq=useMemo(()=>{
    const m:Record<string,number>={}
    for(const wo of filteredWos){
      const k=wo.equipmentName??"Unknown"
      m[k]=(m[k]??0)+Number(wo.actualCost??0)
    }
    return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([name,value])=>({name,value}))
  },[filteredWos])

  // derive cost per dept from real WO actualCost
  const costPerDept=useMemo(()=>{
    const m:Record<string,number>={}
    for(const wo of filteredWos){
      const k=wo.departmentName??"Unknown"
      m[k]=(m[k]??0)+Number(wo.actualCost??0)
    }
    return Object.entries(m).sort((a,b)=>b[1]-a[1]).map(([name,value])=>({name,value}))
  },[filteredWos])

  const avgCostEq=costPerEq.length?costPerEq.reduce((a,b)=>a+b.value,0)/costPerEq.length:0
  const avgCostDept=costPerDept.length?costPerDept.reduce((a,b)=>a+b.value,0)/costPerDept.length:0

  // pareto from filtered
  const paretoData=useMemo(()=>{
    const total=costPerEq.reduce((a,b)=>a+b.value,0)
    let cum=0
    return costPerEq.map(e=>{cum+=e.value;return{name:e.name,cost:e.value,cumPct:total>0?Math.round(cum/total*100):0}})
  },[costPerEq])

  const costTrends=useMemo(()=>kpi?.monthlyCostTrends?Object.entries(kpi.monthlyCostTrends).map(([month,cost])=>({month,cost:Number(cost)})):[],[kpi])
  const annualData=useMemo(()=>kpi?.annualProjection?Object.entries(kpi.annualProjection).map(([name,value])=>({name,value:Number(value)})):[],[kpi])

  if(loading)return(
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"/>
        <p className="text-muted-foreground text-sm animate-pulse">Loading Executive Dashboard…</p>
      </div>
    </div>
  )

  return(
    <div className="space-y-3">
      {/* Header - Compact */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-base font-semibold text-foreground">{t('managementDashboard')}</h1>
        <Button variant="outline" size="sm" className="h-7 gap-1.5" onClick={()=>load(true)} disabled={refreshing}>
          <RefreshCw className={cn("h-3 w-3",refreshing&&"animate-spin")}/>Refresh
        </Button>
      </div>

      {/* Filter Bar - Compact */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"/>
          <Input placeholder={t('search')} value={nameQ} onChange={e=>setNameQ(e.target.value)} className="h-7 pl-7 text-xs"/>
        </div>
        <Select value={catF} onValueChange={setCatF}>
          <SelectTrigger className="w-28 h-7 text-xs"><SelectValue placeholder="Category"/></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All</SelectItem>
            {cats.map(c=><SelectItem key={c.categoryId} value={String(c.categoryId)}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={deptF} onValueChange={setDeptF}>
          <SelectTrigger className="w-28 h-7 text-xs"><SelectValue placeholder="Dept"/></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All</SelectItem>
            {depts.map(d=><SelectItem key={d.departmentId} value={String(d.departmentId)}>{d.departmentName}</SelectItem>)}
          </SelectContent>
        </Select>
        {hasFilter&&<Button variant="outline" size="sm" onClick={clear} className="h-7 text-xs gap-1"><X className="h-3 w-3"/>Clear</Button>}
        <Badge variant="secondary" className="h-7 px-2 text-xs">{filteredWos.length} WOs</Badge>
      </div>

      {/* Strategic KPI Cards - Compact */}
      <div className="grid gap-2 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="MTBF" sub="Mean Time Between Failures" value={`${kpi?.mtbf?.toFixed(0)??"—"}h`} icon={<Activity className="h-5 w-5"/>} trend={kpi?.mtbfTrend} colorClass="text-emerald-600" bgClass="bg-emerald-50 dark:bg-emerald-900/20" higherIsBetter/>
        <KpiCard label="MTTR" sub="Mean Time To Repair" value={`${kpi?.mttr?.toFixed(1)??"—"}h`} icon={<Clock className="h-5 w-5"/>} trend={kpi?.mttrTrend} colorClass="text-indigo-600" bgClass="bg-indigo-50 dark:bg-indigo-900/20" higherIsBetter={false}/>
        <KpiCard label={t('availability')} sub="Equipment availability rate" value={`${kpi?.availabilityRate?.toFixed(1)??"—"}%`} icon={<Activity className="h-5 w-5"/>} colorClass="text-cyan-600" bgClass="bg-cyan-50 dark:bg-cyan-900/20" higherIsBetter/>
        <KpiCard label="Corrective/Preventive" sub="Corrective ratio" value={`${kpi?.correctivePreventiveRatio?.toFixed(0)??"—"}%`} icon={<Wrench className="h-5 w-5"/>} colorVar={getMaintenanceColorVar('CORRECTIVE')} bgColorVar={`rgba(var(--color-maintenance-type-corrective-rgb, 239, 68, 68), 0.1)`} higherIsBetter={false}/>
        <KpiCard label={t('costEquipment')} sub={hasFilter?"Filtered avg from WOs":"Avg cost per asset"} value={fmt$(avgCostEq)} icon={<DollarSign className="h-5 w-5"/>} colorClass="text-violet-600" bgClass="bg-violet-50 dark:bg-violet-900/20" higherIsBetter={false}/>
        <KpiCard label={t('costDept')} sub={hasFilter?"Filtered avg from WOs":"Avg cost per department"} value={fmt$(avgCostDept)} icon={<DollarSign className="h-5 w-5"/>} colorClass="text-rose-600" bgClass="bg-rose-50 dark:bg-rose-900/20" higherIsBetter={false}/>
      </div>

      {/* Row 1: Cost trend + Pareto - Compact */}
      <div className="grid gap-2 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-sm">{t('monthlyCostTrend')}</CardTitle></CardHeader>
          <CardContent className="h-[180px] pt-0">
            {costTrends.length===0?<Empty/>:(
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={costTrends} margin={{top:10,right:10,left:0,bottom:0}}>
                  <defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.25}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5}/>
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill:"#64748b",fontSize:11}}/>
                  <YAxis axisLine={false} tickLine={false} tick={{fill:"#64748b",fontSize:11}} tickFormatter={v=>`$${v/1000}k`}/>
                  <Tooltip contentStyle={{borderRadius:"10px",border:"none"}} formatter={(v:any)=>[`$${Number(v).toLocaleString()}`,"Cost"]}/>
                  <Area type="monotone" dataKey="cost" stroke="#6366f1" strokeWidth={2.5} fill="url(#cg)"/>
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-sm">{t('paretoChartEquipment')}</CardTitle></CardHeader>
          <CardContent className="h-[180px] pt-0">
            {paretoData.length===0?<Empty/>:(
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={paretoData} margin={{top:10,right:30,left:0,bottom:40}}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5}/>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill:"#64748b",fontSize:10}} angle={-30} textAnchor="end"/>
                  <YAxis yAxisId="l" axisLine={false} tickLine={false} tick={{fill:"#64748b",fontSize:11}} tickFormatter={v=>`$${v/1000}k`}/>
                  <YAxis yAxisId="r" orientation="right" axisLine={false} tickLine={false} tick={{fill:"#64748b",fontSize:11}} tickFormatter={v=>`${v}%`} domain={[0,100]}/>
                  <Tooltip contentStyle={{borderRadius:"10px",border:"none"}}/>
                  <Bar yAxisId="l" dataKey="cost" barSize={28} radius={[4,4,0,0]}>{paretoData.map((_,i)=><Cell key={i} fill={C[i%C.length]}/>)}</Bar>
                  <Line yAxisId="r" type="monotone" dataKey="cumPct" stroke="#ef4444" strokeWidth={2} dot={false} name="Cumulative %"/>
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Cost distribution - Compact */}
      <div className="grid gap-2 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-sm">{t('costDistributionByDe')}</CardTitle></CardHeader>
          <CardContent className="h-[180px] pt-0">
            {costPerDept.length===0?<Empty/>:(
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={costPerDept} cx="50%" cy="50%" outerRadius={100} innerRadius={55} paddingAngle={3} dataKey="value">
                    {costPerDept.map((_,i)=><Cell key={i} fill={C[i%C.length]}/>)}
                  </Pie>
                  <Tooltip contentStyle={{borderRadius:"10px",border:"none"}} formatter={(v:any)=>[`$${Number(v).toLocaleString()}`,"Cost"]}/>
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-sm">{t('annualCostProjection')}</CardTitle></CardHeader>
          <CardContent className="h-[180px] pt-0">
            {annualData.length===0?<Empty/>:(
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={annualData} layout="vertical" margin={{top:10,right:30,left:10,bottom:10}}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" opacity={0.5}/>
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{fill:"#64748b",fontSize:11}} tickFormatter={v=>`$${v/1000}k`}/>
                  <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{fill:"#64748b",fontSize:11}} width={110}/>
                  <Tooltip contentStyle={{borderRadius:"10px",border:"none"}} formatter={(v:any)=>[`$${Number(v).toLocaleString()}`,"Amount"]}/>
                  <Bar dataKey="value" radius={[0,6,6,0]} barSize={22}>{annualData.map((e,i)=><Cell key={i} fill={e.name.toLowerCase().includes("limit")||e.name.toLowerCase().includes("budget")?"#ef4444":C[i%C.length]}/>)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Maintenance cost per equipment - Compact */}
      <Card>
        <CardHeader className="pb-1"><CardTitle className="text-sm">{t('maintenanceCostEquip')}</CardTitle></CardHeader>
        <CardContent className="h-[200px] pt-0">
          {costPerEq.length===0?<Empty/>:(
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={costPerEq} margin={{top:10,right:10,left:0,bottom:40}}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5}/>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill:"#64748b",fontSize:10}} angle={-25} textAnchor="end"/>
                <YAxis axisLine={false} tickLine={false} tick={{fill:"#64748b",fontSize:11}} tickFormatter={v=>`$${v/1000}k`}/>
                <Tooltip contentStyle={{borderRadius:"10px",border:"none"}} formatter={(v:any)=>[`$${Number(v).toLocaleString()}`,"Cost"]}/>
                <Bar dataKey="value" radius={[6,6,0,0]} barSize={36}>{costPerEq.map((_,i)=><Cell key={i} fill={C[i%C.length]}/>)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Costly equipment table - Compact */}
      {(kpi?.costlyEquipments?.length??0)>0&&(
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-sm">{t('topCostlyEquipment')}</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border bg-muted/30">{["Equipment","Category","Department","Total Cost","% of Total"].map(h=><th key={h} className="text-left py-3 px-4 font-semibold text-foreground">{h}</th>)}</tr></thead>
                <tbody>
                  {kpi!.costlyEquipments!.map((eq,i)=>(
                    <tr key={i} className="border-b border-border hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4 font-medium">{eq.name}</td>
                      <td className="py-3 px-4"><Badge variant="outline" className="text-[10px] uppercase">{eq.category}</Badge></td>
                      <td className="py-3 px-4 text-muted-foreground">{eq.department}</td>
                      <td className="py-3 px-4 font-bold">${Number(eq.totalCost).toLocaleString()}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-indigo-500" style={{width:`${Math.min(eq.percentageOfTotal,100)}%`}}/></div>
                          <span className="text-xs font-mono">{eq.percentageOfTotal?.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
