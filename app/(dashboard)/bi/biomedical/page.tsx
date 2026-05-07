"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { 
  Heart, 
  ShieldCheck, 
  Activity,
  AlertTriangle,
  Clock
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { biApi } from "@/lib/api/bi"
import type { KpiResponse } from "@/lib/api/types"
import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"

function KpiCard({ title, value, description, icon, color, trend, inverseTrend = false }: any) {
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
            </div>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
          <div className={cn("p-3 rounded-xl", color.replace('text-', 'bg-').replace('500', '500/10'), color.replace('text-', 'bg-').replace('600', '600/10'))}>
             <div className={color}>{icon}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function HealthProgressBar({ title, subtitle, percentage }: { title: string, subtitle: string, percentage: number }) {
  const getColor = (p: number) => {
    if (p >= 90) return "bg-emerald-500"
    if (p >= 80) return "bg-amber-500"
    return "bg-rose-500"
  }

  return (
    <div className="space-y-2 mb-6">
       <div className="flex justify-between items-end">
          <div>
            <h4 className="font-medium text-foreground">{title}</h4>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
          <span className="font-bold text-foreground">{percentage}%</span>
       </div>
       <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
          <div 
             className={cn("h-full rounded-full transition-all duration-1000 ease-out", getColor(percentage))} 
             style={{ width: `${percentage}%` }}
          />
       </div>
    </div>
  )
}

export default function BiomedicalDashboard() {
  const { language, t } = useI18n()
  const [data, setData] = useState<KpiResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    biApi.getKpis()
      .then(setData)
      .finally(() => setIsLoading(false))
  }, [])

  if (isLoading) {
    return <div className="p-8 text-center animate-pulse text-muted-foreground">Loading Biomedical Profile...</div>
  }

  return (
    <motion.div initial="initial" animate="animate" className="space-y-6 pb-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Biomedical Engineering</h1>
          <p className="text-muted-foreground">Health and compliance of critical medical devices.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard 
           title="Critical Equipment" 
           value="156" 
           description="Devices monitored"
           icon={<Heart className="h-5 w-5" />}
           color="text-rose-500"
        />
        <KpiCard 
           title="Compliance Rate" 
           value={`${data?.complianceRate?.toFixed(1) || 99.2}%`} 
           description="Regulatory standards"
           icon={<ShieldCheck className="h-5 w-5" />}
           color="text-emerald-500"
        />
        <KpiCard 
           title="Avg MTTR" 
           value={`${data?.mttr?.toFixed(1) || 1.8}h`} 
           description="Mean time to repair"
           icon={<Activity className="h-5 w-5" />}
           color="text-sky-500"
        />
        <KpiCard 
           title="Safety Incidents" 
           value="0" 
           description="This quarter"
           icon={<AlertTriangle className="h-5 w-5" />}
           color="text-violet-500"
        />
      </div>

      <Card className="border-none bg-card/50 backdrop-blur-sm shadow-xl ring-1 ring-border">
        <CardHeader>
          <CardTitle className="text-lg">Equipment Health Status</CardTitle>
          <CardDescription>Real-time health indicators for critical biomedical devices</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="pt-4">
             <HealthProgressBar title="MRI" subtitle="Critical Criticality" percentage={92} />
             <HealthProgressBar title="CT" subtitle="Critical Criticality" percentage={88} />
             <HealthProgressBar title="Ventilators" subtitle="Critical Criticality" percentage={95} />
             <HealthProgressBar title="Infusion Pumps" subtitle="High Criticality" percentage={85} />
             <HealthProgressBar title="ECG" subtitle="High Criticality" percentage={98} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-none bg-card/50 backdrop-blur-sm shadow-xl ring-1 ring-border mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Compliance & Safety Alerts</CardTitle>
          <CardDescription>Active alerts requiring attention</CardDescription>
        </CardHeader>
        <CardContent>
           <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-muted/30 rounded-xl border border-amber-500/20">
                 <div className="flex gap-4 items-center">
                    <div className="p-2 bg-amber-500/10 rounded-lg"><AlertTriangle className="h-5 w-5 text-amber-500" /></div>
                    <div>
                      <h3 className="font-semibold text-foreground">Calibration Due</h3>
                      <p className="text-sm text-muted-foreground">ECG #3</p>
                    </div>
                 </div>
                 <span className="text-xs font-semibold px-3 py-1 bg-amber-500/10 text-amber-600 rounded-full">5d</span>
              </div>
              
              <div className="flex justify-between items-center p-4 bg-muted/30 rounded-xl border border-rose-500/20">
                 <div className="flex gap-4 items-center">
                    <div className="p-2 bg-rose-500/10 rounded-lg"><AlertTriangle className="h-5 w-5 text-rose-500" /></div>
                    <div>
                      <h3 className="font-semibold text-foreground">Inspection Overdue</h3>
                      <p className="text-sm text-muted-foreground">Defibrillator #2</p>
                    </div>
                 </div>
                 <span className="text-xs font-semibold px-3 py-1 bg-rose-500/10 text-rose-600 rounded-full">Overdue</span>
              </div>

              <div className="flex justify-between items-center p-4 bg-muted/30 rounded-xl border border-amber-500/20">
                 <div className="flex gap-4 items-center">
                    <div className="p-2 bg-amber-500/10 rounded-lg"><AlertTriangle className="h-5 w-5 text-amber-500" /></div>
                    <div>
                      <h3 className="font-semibold text-foreground">Service Reminder</h3>
                      <p className="text-sm text-muted-foreground">Ventilator #4</p>
                    </div>
                 </div>
                 <span className="text-xs font-semibold px-3 py-1 bg-amber-500/10 text-amber-600 rounded-full">10d</span>
              </div>
           </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
