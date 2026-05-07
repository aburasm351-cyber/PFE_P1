import { Language } from "./i18n"

export type StatusKey = 
  | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CLOSED' | 'CREATED' | 'ASSIGNED' 
  | 'UNDER_CONTROL' | 'OVERDUE' | 'OPEN' | 'QUALIFIED' | 'UNDER_REPAIR' 
  | 'OPERATIONAL' | 'ARCHIVED' | 'RETIRED' | 'OUT_OF_SERVICE' | 'IN_SERVICE'

export type PriorityKey = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
export type WorkOrderTypeKey = 'CORRECTIVE' | 'PREVENTIVE' | 'REGULATORY' | 'PREDICTIVE'
export type EquipmentTypeKey = 'BIOMEDICAL' | 'TECHNICAL' | 'IT' | 'UNKNOWN'
export type TaskStatusKey = 'PENDING' | 'COMPLETED' | 'SKIPPED'
export type AIDecisionKey = 'EARLY_WARNING' | 'NORMAL_MONITORING'
export type PredictiveRiskKey = 'HIGH' | 'MEDIUM' | 'LOW'

export const ENUM_TRANSLATIONS: Record<string, Record<string, Record<Language, string>>> = {
  status: {
    PENDING: { en: "Pending", fr: "En attente", ar: "قيد الانتظار" },
    IN_PROGRESS: { en: "In Progress", fr: "En cours", ar: "قيد التنفيذ" },
    COMPLETED: { en: "Completed", fr: "Terminé", ar: "مكتمل" },
    CLOSED: { en: "Closed", fr: "Fermé", ar: "مغلق" },
    CREATED: { en: "Created", fr: "Créé", ar: "تم الإنشاء" },
    ASSIGNED: { en: "Assigned", fr: "Assigné", ar: "تم التعيين" },
    UNDER_CONTROL: { en: "Under Control", fr: "Sous contrôle", ar: "تحت السيطرة" },
    OVERDUE: { en: "Overdue", fr: "En retard", ar: "متأخر" },
    OPEN: { en: "Open", fr: "Ouvert", ar: "مفتوح" },
    QUALIFIED: { en: "Qualified", fr: "Qualifié", ar: "مؤهل" },
    UNDER_REPAIR: { en: "Under Repair", fr: "En réparation", ar: "قيد الإصلاح" },
    OPERATIONAL: { en: "Operational", fr: "Opérationnel", ar: "جاهز للعمل" },
    ARCHIVED: { en: "Archived", fr: "Archivé", ar: "مؤرشف" },
    RETIRED: { en: "Retired", fr: "Retiré", ar: "خارج الخدمة" },
    OUT_OF_SERVICE: { en: "Out of Service", fr: "Hors service", ar: "خارج الخدمة" },
    IN_SERVICE: { en: "In Service", fr: "En service", ar: "في الخدمة" },
    NEW: { en: "New", fr: "Nouveau", ar: "جديد" },
    RESOLVED: { en: "Resolved", fr: "Résolu", ar: "تم الحل" },
    REJECTED: { en: "Rejected", fr: "Rejeté", ar: "مرفوض" },
    CONVERTED_TO_WORK_ORDER: { en: "In WO", fr: "En OT", ar: "في أمر عمل" },
  },
  priority: {
    CRITICAL: { en: "Critical", fr: "Critique", ar: "حرجة" },
    HIGH: { en: "High", fr: "Haute", ar: "عالية" },
    MEDIUM: { en: "Medium", fr: "Moyenne", ar: "متوسطة" },
    LOW: { en: "Low", fr: "Basse", ar: "منخفضة" },
  },
  woType: {
    CORRECTIVE: { en: "Corrective", fr: "Correctif", ar: "تصحيحي" },
    PREVENTIVE: { en: "Preventive", fr: "Préventif", ar: "وقائي" },
    REGULATORY: { en: "Regulatory", fr: "Réglementaire", ar: "تنظيمي" },
    PREDICTIVE: { en: "Predictive", fr: "Prédictif", ar: "تنبؤي" },
  },
  equipmentType: {
    BIOMEDICAL: { en: "Biomedical", fr: "Biomédical", ar: "بيولوجي طبي" },
    TECHNICAL: { en: "Technical", fr: "Technique", ar: "تقني" },
    IT: { en: "IT", fr: "Informatique", ar: "معلوماتي" },
    UNKNOWN: { en: "Unknown", fr: "Inconnu", ar: "غير معروف" },
  },
  taskStatus: {
    PENDING: { en: "Pending", fr: "En attente", ar: "قيد الانتظار" },
    COMPLETED: { en: "Completed", fr: "Terminé", ar: "مكتمل" },
    SKIPPED: { en: "Skipped", fr: "Ignoré", ar: "تخطي" },
  },
  aiDecision: {
    EARLY_WARNING: { en: "Early Warning", fr: "Alerte précoce", ar: "تحذير مبكر" },
    NORMAL_MONITORING: { en: "Normal Monitoring", fr: "Surveillance normale", ar: "مراقبة عادية" },
  },
  predictiveRisk: {
    HIGH: { en: "High Risk", fr: "Risque élevé", ar: "خطر عالٍ" },
    MEDIUM: { en: "Medium Risk", fr: "Risque moyen", ar: "خطر متوسط" },
    LOW: { en: "Low Risk", fr: "Risque faible", ar: "خطر منخفض" },
  }
}

export function translateEnum(category: string, key: string | undefined | null, lang: Language): string {
  if (!key) return ""
  const normalizedKey = key.toUpperCase()
  return ENUM_TRANSLATIONS[category]?.[normalizedKey]?.[lang] || key
}
