"use client"

import { useEffect, useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Bell, 
  CheckCheck, 
  Trash2, 
  AlertCircle, 
  Clock, 
  Info, 
  Filter,
  Search,
  ChevronRight,
  ExternalLink,
  CalendarDays
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useI18n } from "@/lib/i18n"
import { useAuth } from "@/lib/auth-context"
import { notificationsApi } from "@/lib/api/notifications"
import { cn } from "@/lib/utils"
import Link from "next/link"

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 }
}

export default function NotificationsPage() {
  const { language, t } = useI18n()
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<'ALL' | 'UNREAD' | 'WARNING' | 'RECOMMENDATION'>('ALL')

  const loadData = async () => {
    if (!user?.id) return
    try {
      setIsLoading(true)
      const data = await notificationsApi.getAll(user.id)
      setNotifications(data.content || [])
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [user?.id])

  const filteredNotifications = useMemo(() => {
    return notifications.filter(note => {
      const matchesSearch = note.message.toLowerCase().includes(search.toLowerCase())
      const matchesFilter = filter === 'ALL' || 
                           (filter === 'UNREAD' && !note.isRead) ||
                           note.type === filter
      return matchesSearch && matchesFilter
    })
  }, [notifications, search, filter])

  const markRead = async (id: number) => {
    try {
      await notificationsApi.markAsRead(id)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
    } catch (err) {}
  }

  const markAllRead = async () => {
    if (!user?.id) return
    try {
      await notificationsApi.markAllAsRead(user.id)
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    } catch (err) {}
  }

  const clearNotification = async (id: number) => {
    try {
      await notificationsApi.delete(id)
      setNotifications(prev => prev.filter(n => n.id !== id))
    } catch (err) {}
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'WARNING': return <AlertCircle className="h-5 w-5 text-amber-500" />
      case 'RECOMMENDATION': return <Clock className="h-5 w-5 text-indigo-500" />
      default: return <Info className="h-5 w-5 text-blue-500" />
    }
  }

  const getLink = (note: any) => {
    if (note.message.toLowerCase().includes('work order')) {
      return `/work-orders/${note.referenceId}`
    }
    if (note.message.toLowerCase().includes('inventory') || note.message.toLowerCase().includes('stock')) {
      return `/inventory`
    }
    return null
  }

  return (
    <motion.div 
      initial="initial" 
      animate="animate" 
      className="flex-1 space-y-6 overflow-auto max-w-4xl mx-auto"
    >
      {/* Header */}
      <motion.div variants={fadeInUp} className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Bell className="h-8 w-8 text-primary" />
            {t('notificationCenter')}
          </h1>
          <p className="text-muted-foreground">
            {t('reviewYourHistoricAl')}
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={markAllRead} 
          className="gap-2 border-border/60 hover:bg-primary/5 transition-all"
        >
          <CheckCheck className="h-4 w-4" />
          {t('markAllAsRead')}
        </Button>
      </motion.div>

      {/* Filters */}
      <motion.div variants={fadeInUp} className="flex flex-col gap-4 md:flex-row md:items-center flex-wrap min-w-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder={t('searchAlerts')} 
            className="pl-9 bg-card/50 backdrop-blur-sm border-border"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2 min-w-0">
           {['ALL', 'UNREAD', 'WARNING', 'RECOMMENDATION'].map((f) => (
             <Button
                key={f}
                variant={filter === f ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(f as any)}
                className="text-xs h-8"
             >
                {f}
             </Button>
           ))}
        </div>
      </motion.div>

      {/* List */}
      <motion.div variants={fadeInUp}>
        <Card className="border-none bg-card/50 backdrop-blur-sm shadow-xl ring-1 ring-border overflow-hidden">
          <CardContent className="p-0">
            {isLoading ? (
               <div className="p-20 text-center text-muted-foreground animate-pulse">Loading notification feed...</div>
            ) : filteredNotifications.length === 0 ? (
               <div className="p-20 text-center">
                 <div className="mb-4 flex justify-center">
                   <Bell className="h-12 w-12 text-muted-foreground opacity-20" />
                 </div>
                 <p className="text-muted-foreground italic">No notifications found.</p>
               </div>
            ) : (
              <div className="flex flex-col">
                <AnimatePresence mode="popLayout">
                  {filteredNotifications.map((note) => (
                    <motion.div
                      layout
                      key={note.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, x: -20 }}
                      className={cn(
                        "p-6 border-b border-border/40 flex items-start justify-between group relative transition-colors",
                        !note.isRead ? "bg-primary/5" : "hover:bg-muted/30"
                      )}
                    >
                      <div className="flex gap-4 flex-1">
                        <div className={cn(
                          "h-10 w-10 rounded-full flex items-center justify-center shrink-0 shadow-sm",
                          note.type === 'WARNING' ? "bg-amber-100 dark:bg-amber-900/30" :
                          note.type === 'RECOMMENDATION' ? "bg-indigo-100 dark:bg-indigo-900/30" : "bg-blue-100 dark:bg-blue-900/30"
                        )}>
                          {getIcon(note.type)}
                        </div>
                        <div className="flex flex-col gap-1 min-w-0">
                          <div className="flex items-center gap-2">
                             <Badge variant="outline" className="text-[9px] uppercase tracking-tighter h-5 px-1.5 border-border/60">
                               {note.type}
                             </Badge>
                             <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                               <CalendarDays className="h-3 w-3" />
                               {new Date(note.createdAt).toLocaleString()}
                             </span>
                          </div>
                          <p className={cn(
                            "text-sm leading-relaxed",
                            !note.isRead ? "font-semibold text-foreground" : "text-foreground/80"
                          )}>
                            {note.message}
                          </p>
                          {getLink(note) && (
                            <Link href={getLink(note)!}>
                              <Button variant="link" size="sm" className="h-auto p-0 text-primary text-xs gap-1.5 mt-1">
                                <ExternalLink className="h-3 w-3" />
                                View Details
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         {!note.isRead && (
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => markRead(note.id)}>
                               <CheckCheck className="h-4 w-4" />
                            </Button>
                         )}
                         <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-500 hover:text-rose-600" onClick={() => clearNotification(note.id)}>
                            <Trash2 className="h-4 w-4" />
                         </Button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
