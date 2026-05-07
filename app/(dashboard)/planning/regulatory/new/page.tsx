"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  ShieldCheck,
  FileText,
  ListTodo
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { EquipmentSelector } from "@/components/equipment-selector"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useI18n } from "@/lib/i18n"
import { useToast } from "@/components/ui/use-toast"
import { regulatoryApi } from "@/lib/api/regulatory"
import { equipmentApi } from "@/lib/api/equipment"
import { usersApi } from "@/lib/api/users"
import type { EquipmentResponse, UserResponse } from "@/lib/api/types"

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 }
}

export default function NewRegulatoryPlanPage() {
  const { t, language } = useI18n()
  const { toast } = useToast()
  const router = useRouter()
  
  const [isLoading, setIsLoading] = useState(false)
  const [equipmentList, setEquipmentList] = useState<EquipmentResponse[]>([])
  const [technicians, setTechnicians] = useState<UserResponse[]>([])
  
  // Form State
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    equipmentId: "",
    priority: "MEDIUM",
    recurrenceUnit: "MONTHLY",
    recurrenceValue: 1,
    startDate: new Date().toISOString().split('T')[0],
    reminderDays: 7,
    gracePeriod: 0,
    isMandatory: true,
    complianceReference: "",
    requiresDocument: false,
    documentType: "",
    assignedTechnicianId: "",
    estimatedDuration: 1.0,
  })

  // Checklist State
  const [checklist, setChecklist] = useState<{ id: string; label: string; mandatory: boolean }[]>([
    { id: '1', label: '', mandatory: true }
  ])

  useEffect(() => {
    equipmentApi.getAll().then(setEquipmentList).catch(console.error)
    usersApi.getAll().then(users => {
      setTechnicians(users.filter(u => u.roleName === 'TECHNICIAN' || u.roleName === 'ROLE_TECHNICIAN'))
    }).catch(console.error)
  }, [])

  const addStep = () => {
    setChecklist([...checklist, { id: Date.now().toString(), label: '', mandatory: true }])
  }

  const removeStep = (id: string) => {
    if (checklist.length > 1) {
      setChecklist(checklist.filter(s => s.id !== id))
    }
  }

  const updateStep = (id: string, label: string) => {
    setChecklist(checklist.map(s => s.id === id ? { ...s, label } : s))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.equipmentId) {
        toast({ title: "Error", description: "Please select an equipment", variant: "destructive" })
        return
    }
    
    const emptySteps = checklist.filter(s => !s.label.trim())
    if (emptySteps.length > 0) {
        toast({ title: "Checklist Error", description: "Please fill or remove empty steps", variant: "destructive" })
        return
    }

    setIsLoading(true)
    try {
      const payload = {
        ...formData,
        equipmentId: parseInt(formData.equipmentId),
        assignedTechnicianId: formData.assignedTechnicianId ? parseInt(formData.assignedTechnicianId) : null,
        recurrenceValue: parseInt(formData.recurrenceValue.toString()),
        reminderDays: parseInt(formData.reminderDays.toString()),
        gracePeriod: parseInt(formData.gracePeriod.toString()),
        estimatedDuration: parseFloat(formData.estimatedDuration.toString()),
        startDate: new Date(formData.startDate).toISOString(),
        checklistTemplate: JSON.stringify(checklist.map(s => ({ label: s.label, status: 'PENDING', mandatory: s.mandatory })))
      }

      await regulatoryApi.create(payload)
      toast({ title: t('success'), description: 'Regulatory plan created successfully' })
      router.push('/planning/regulatory')
    } catch (err) {
      console.error(err)
      toast({ title: "Error", description: "Failed to create plan", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex-1 space-y-6 max-w-5xl mx-auto pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">
            {t('createRegulatoryPlan')}
          </h1>
        </div>
        <Button 
            onClick={handleSubmit} 
            disabled={isLoading}
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 rounded-xl px-6"
        >
          {isLoading ? <Clock className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          {t('savePlan')}
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-3">
        {/* Basic Information */}
        <motion.div variants={fadeInUp} initial="initial" animate="animate" className="md:col-span-2 space-y-6">
          <Card className="border-border bg-card/40 backdrop-blur-sm rounded-2xl shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShieldCheck className="h-5 w-5 text-primary" />
                {t('generalInformation')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="title">{t('planTitle')}</Label>
                <Input 
                  id="title" 
                  placeholder="e.g. Annual Fire Safety Inspection" 
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  required
                  className="rounded-xl"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="desc">{t('descriptionObjective')}</Label>
                <Textarea 
                  id="desc" 
                  placeholder="Describe the regulatory requirement..." 
                  className="min-h-[100px] rounded-xl"
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <EquipmentSelector
                      equipmentList={equipmentList}
                      value={formData.equipmentId}
                      onChange={(val) => setFormData({...formData, equipmentId: val})}
                    />
                  </div>
                <div className="grid gap-2">
                  <Label>{t('priority')}</Label>
                  <Select 
                     defaultValue="MEDIUM"
                     onValueChange={v => setFormData({...formData, priority: v})}
                  >
                    <SelectTrigger className="rounded-xl">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="LOW">Low</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="CRITICAL">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Checklist Template */}
          <Card className="border-border bg-card/40 backdrop-blur-sm rounded-2xl shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ListTodo className="h-5 w-5 text-indigo-500" />
                {t('checklistTemplate')}
              </CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addStep} className="rounded-lg h-8">
                <Plus className="h-4 w-4 mr-1" /> {t('addStep')}
              </Button>
            </CardHeader>
            <CardDescription className="px-6 mb-2">
                Defined steps will be copied to generated work orders.
            </CardDescription>
            <CardContent className="space-y-3">
              <AnimatePresence>
                {checklist.map((step, index) => (
                  <motion.div 
                    key={step.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="flex gap-2 items-center group"
                  >
                    <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold shrink-0">
                        {index + 1}
                    </div>
                    <Input 
                      placeholder="Step description..." 
                      className="rounded-xl h-9"
                      value={step.label}
                      onChange={e => updateStep(step.id, e.target.value)}
                    />
                    <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10 transition-all"
                        onClick={() => removeStep(step.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recurrence & Compliance Sidebar */}
        <motion.div variants={fadeInUp} initial="initial" animate="animate" className="space-y-6">
          <Card className="border-border bg-card/40 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden">
            <div className="h-1 w-full bg-primary" />
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                {t('recurrence')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>{t('recurrenceUnit')}</Label>
                <Select 
                     defaultValue="MONTHLY"
                     onValueChange={v => setFormData({...formData, recurrenceUnit: v})}
                >
                  <SelectTrigger className="rounded-xl">
                      <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="MONTHLY">Monthly</SelectItem>
                      <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                      <SelectItem value="SEMI_ANNUAL">Semi-Annual</SelectItem>
                      <SelectItem value="ANNUAL">Annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>{t('everyValue')}</Label>
                <Input 
                   type="number" 
                   className="rounded-xl" 
                   value={formData.recurrenceValue}
                   onChange={e => setFormData({...formData, recurrenceValue: parseInt(e.target.value)})}
                />
              </div>
              <div className="grid gap-2">
                <Label>{t('startDate')}</Label>
                <Input 
                    type="date" 
                    className="rounded-xl" 
                    value={formData.startDate}
                    onChange={e => setFormData({...formData, startDate: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label>{t('estDurationHrs')}</Label>
                <Input 
                    type="number" 
                    step="0.5" 
                    className="rounded-xl" 
                    value={formData.estimatedDuration}
                    onChange={e => setFormData({...formData, estimatedDuration: parseFloat(e.target.value)})}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </form>
    </div>
  )
}
