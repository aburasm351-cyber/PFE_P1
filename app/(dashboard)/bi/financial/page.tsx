"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { 
  DollarSign
} from "lucide-react"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  PieChart,
  Pie,
  Cell
} from "recharts"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { biApi } from "@/lib/api/bi"
import type { KpiResponse } from "@/lib/api/types"
import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"

const PIE_COLORS = ['#06b6d4', '#8b5cf6', '#f59e0b', '#64748b'];

function KpiCard({ title, value, trend, icon, color, inverseTrend = false }: any) {
  const isPositiveTrend = trend > 0;
  const isGood = inverseTrend ? !isPositiveTrend : isPositiveTrend;
  
  return (
    <Card className="border-none bg-card/50 backdrop-blur-sm shadow-xl ring-1 ring-border">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold tracking-tight">{value}</span>
              {trend !== undefined && (
                <span className={cn(
                  "flex items-center text-xs font-medium px-2 py-1 rounded-full",
                  isGood ? "text-emerald-700 bg-emerald-500/10" : "text-rose-700 bg-rose-500/10"
                )}>
                  {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
                </span>
              )}
            </div>
          </div>
          <div className={cn("p-3 rounded-xl", color.replace('text-', 'bg-').replace('500', '500/10'), color.replace('text-', 'bg-').replace('600', '600/10'))}>
             <div className={color}>{icon}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function FinancialDashboard() {
  const { language, t } = useI18n()
  const [data, setData] = useState<KpiResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    biApi.getKpis()
      .then(setData)
      .finally(() => setIsLoading(false))
  }, [])

  const costDistribution = [
    { name: "Parts", value: 35 },
    { name: "Labor", value: 45 },
    { name: "Equipment", value: 15 },
    { name: "Other", value: 5 }
  ]

  const deptBudgets = [
    { name: 'Radiology', Budget: 450, Actual: 420 },
    { name: 'ICU', Budget: 380, Actual: 395 },
    { name: 'Surgery', Budget: 320, Actual: 310 },
    { name: 'Cardiology', Budget: 280, Actual: 275 }
  ]

  if (isLoading) {
    return <div className="p-8 text-center animate-pulse text-muted-foreground">Loading Financial Reports...</div>
  }

  return (
    <motion.div initial="initial" animate="animate" className="space-y-6 pb-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Financial Overview</h1>
          <p className="text-muted-foreground">Budget utilization and return on investment.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard 
           title="YTD Budget" 
           value={`$${(data?.ytdBudget || 2400000)/1000000}M`} 
           trend={8} 
           icon={<DollarSign className="h-5 w-5" />}
           color="text-emerald-500"
        />
        <KpiCard 
           title="Maintenance Spend" 
           value={`$${((data?.totalMaintenanceCost || 1800000)/1000000).toFixed(1)}M`} 
           trend={-5} 
           inverseTrend={true}
           icon={<DollarSign className="h-5 w-5" />}
           color="text-emerald-500"
        />
        <KpiCard 
           title="Equipment ROI" 
           value={`${data?.equipmentRoi?.toFixed(1) || 3.2}x`} 
           trend={12} 
           icon={<DollarSign className="h-5 w-5" />}
           color="text-emerald-500"
        />
        <KpiCard 
           title="Cost Avoidance" 
           value={`$${((data?.costAvoidance || 890000)/1000).toFixed(0)}K`} 
           trend={18} 
           icon={<DollarSign className="h-5 w-5" />}
           color="text-emerald-500"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
         {/* Pie Chart */}
         <Card className="border-none bg-card/50 backdrop-blur-sm shadow-xl ring-1 ring-border">
          <CardHeader>
            <CardTitle className="text-lg">Cost Distribution</CardTitle>
            <CardDescription>YTD maintenance spending breakdown</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={costDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {costDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bar Chart */}
        <Card className="border-none bg-card/50 backdrop-blur-sm shadow-xl ring-1 ring-border">
          <CardHeader>
            <CardTitle className="text-lg">Department Budget vs Actual</CardTitle>
            <CardDescription>Budget variance by department</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptBudgets} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} />
                   <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                   <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                   <Tooltip 
                     cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                     contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                   />
                   <Legend verticalAlign="bottom" height={36}/>
                   <Bar dataKey="Budget" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                   <Bar dataKey="Actual" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                </BarChart>
             </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none bg-card/50 backdrop-blur-sm shadow-xl ring-1 ring-border mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Detailed Budget Summary</CardTitle>
          <CardDescription>Department breakdown with savings analysis</CardDescription>
        </CardHeader>
        <CardContent>
           <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left py-4 px-6 font-semibold">Department</th>
                    <th className="text-left py-4 px-6 font-semibold">Budget</th>
                    <th className="text-left py-4 px-6 font-semibold">Actual</th>
                    <th className="text-left py-4 px-6 font-semibold">Variance</th>
                  </tr>
                </thead>
                <tbody>
                  {deptBudgets.map((dept, i) => {
                    const variance = dept.Budget - dept.Actual;
                    const isPositive = variance >= 0;
                    return (
                      <tr key={i} className="border-b border-border hover:bg-muted/30">
                        <td className="py-4 px-6 font-medium">{dept.name}</td>
                        <td className="py-4 px-6 text-muted-foreground">${dept.Budget}K</td>
                        <td className="py-4 px-6 text-muted-foreground">${dept.Actual}K</td>
                        <td className="py-4 px-6">
                           <span className={cn(
                             "px-2 py-1 rounded",
                             isPositive ? "text-emerald-700 bg-emerald-500/10" : "text-rose-700 bg-rose-500/10"
                           )}>
                             {isPositive ? '+' : '-'}${Math.abs(variance)}K
                           </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
           </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
