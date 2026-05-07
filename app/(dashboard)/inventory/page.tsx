"use client"

import { useEffect, useState, useMemo } from "react"
import { motion } from "framer-motion"
import { 
  Package, 
  Plus, 
  Search, 
  AlertTriangle,
  ArrowUpDown,
  Edit2,
  Trash2,
  Filter,
  Layers,
  MapPin,
  Truck,
  History,
  CheckCircle,
  XCircle,
  TrendingDown,
  DollarSign,
  CalendarDays,
  FileText,
  Upload
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
import { inventoryApi } from "@/lib/api/inventory"
import type { SparePartResponse } from "@/lib/api/types"
import { cn } from "@/lib/utils"

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 }
}

export default function InventoryPage() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth()
  const { t, language } = useI18n()
  const isRtl = language === 'ar'
  const [parts, setParts] = useState<SparePartResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 25
  useEffect(() => {
    setCurrentPage(1)
  }, [search, categoryFilter])

  const [valuation, setValuation] = useState(0)
  const [pendingRestocks, setPendingRestocks] = useState<any[]>([])
  const [isRestockDialogOpen, setIsRestockDialogOpen] = useState(false)
  const [selectedPartForRestock, setSelectedPartForRestock] = useState<number | null>(null)
  const [restockQty, setRestockQty] = useState(10)

  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false)
  const [selectedRequestForApproval, setSelectedRequestForApproval] = useState<any | null>(null)
  const [approvalQty, setApprovalQty] = useState<number>(0)

  const [isDirectAddDialogOpen, setIsDirectAddDialogOpen] = useState(false)
  const [selectedPartForDirectAdd, setSelectedPartForDirectAdd] = useState<number | null>(null)
  const [directAddQty, setDirectAddQty] = useState(10)

  const [newPart, setNewPart] = useState({
    name: "",
    sku: "",
    category: "",
    quantityInStock: 0,
    minStockLevel: 5,
    unitCost: 0,
    location: "",
    supplier: ""
  })

  const loadData = async () => {
    if (!isAuthenticated) return
    setIsLoading(true)
    try {
      const [partsData, valuationData, pendingData] = await Promise.all([
        inventoryApi.list(),
        inventoryApi.getValuation(),
        inventoryApi.getPendingRestocks()
      ])
      setParts(partsData)
      setValuation(valuationData)
      setPendingRestocks(pendingData)
    } catch (error) {
      console.error("Failed to load inventory data", error)
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
      await inventoryApi.create(newPart)
      setIsDialogOpen(false)
      setNewPart({
        name: "",
        sku: "",
        category: "",
        quantityInStock: 0,
        minStockLevel: 5,
        unitCost: 0,
        location: "",
        supplier: ""
      })
      loadData()
    } catch (error) {
      console.error("Failed to add spare part", error)
    }
  }

  const handleCreateRestock = async () => {
    if (!selectedPartForRestock || !user?.id) return
    try {
      await inventoryApi.requestRestock(selectedPartForRestock, restockQty, user.id)
      setIsRestockDialogOpen(false)
      loadData()
    } catch (e) {
      console.error(e)
    }
  }

  const handleRejectRestock = async (requestId: number) => {
    try {
      await inventoryApi.deleteRestockRequest(requestId)
      loadData()
    } catch (e) {
      console.error(e)
    }
  }

  const handleApproveRestock = async () => {
    if (!selectedRequestForApproval) return
    try {
      await inventoryApi.approveRestock(selectedRequestForApproval.requestId, approvalQty)
      setIsApprovalDialogOpen(false)
      setSelectedRequestForApproval(null)
      loadData()
    } catch (e) {
      console.error(e)
    }
  }

  const handleDirectAddStock = async () => {
    if (!selectedPartForDirectAdd) return
    try {
      await inventoryApi.adjustStock(selectedPartForDirectAdd, directAddQty, "ADD")
      setIsDirectAddDialogOpen(false)
      loadData()
    } catch (e) {
      console.error(e)
    }
  }

  const filteredParts = useMemo(() => {
    return parts.filter(part => {
      const matchesSearch = (part.name?.toLowerCase() || "").includes(search.toLowerCase()) || 
                           (part.sku?.toLowerCase() || "").includes(search.toLowerCase())
      const matchesCategory = categoryFilter === "all" || part.category === categoryFilter
      return matchesSearch && matchesCategory
    })
  }, [parts, search, categoryFilter])

  const paginatedParts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredParts.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredParts, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filteredParts.length / itemsPerPage)

  const categories = useMemo(() => {
    const cats = new Set(parts.map(p => p.category).filter(Boolean))
    return Array.from(cats) as string[]
  }, [parts])

  const getStockBadge = (part: SparePartResponse) => {
    const isLow = part.quantityInStock <= part.minStockLevel
    if (part.quantityInStock === 0) {
      return <Badge variant="destructive">{language === 'ar' ? 'نفدت الكمية' : language === 'fr' ? 'Rupture' : 'Out of Stock'}</Badge>
    }
    if (isLow) {
      return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">{language === 'ar' ? 'مخزون منخفض' : language === 'fr' ? 'Stock bas' : 'Low Stock'}</Badge>
    }
    return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">{language === 'ar' ? 'في المخزون' : language === 'fr' ? 'En stock' : 'In Stock'}</Badge>
  }

  const columns: Column<SparePartResponse>[] = [
    { 
      header: t('partName'), 
      accessor: (part) => (
        <div>
          <div className="font-medium text-base">{part.name}</div>
          <div className="text-xs text-muted-foreground">{part.category}</div>
        </div>
      ),
      rtlOrder: 1
    },
    { 
      header: t('skuReference'), 
      accessor: (part) => <span className="font-mono text-xs">{part.sku}</span>,
      rtlOrder: 2
    },
    { 
      header: t('status'), 
      accessor: (part) => (
        <div>
          <div className="flex items-center gap-3">
            <span className="font-bold text-lg">{part.quantityInStock}</span>
            {getStockBadge(part)}
          </div>
          <div className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">
            {language === 'ar' ? 'الأدنى' : 'Min'}: {part.minStockLevel} {t('units')}
          </div>
        </div>
      ),
      rtlOrder: 3
    },
    { 
      header: t('location'), 
      accessor: (part) => (
        <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
          <MapPin className="h-3.5 w-3.5" />
          <span>{part.location || 'N/A'}</span>
        </div>
      ),
      rtlOrder: 4
    },
    { 
      header: t('unitCost'), 
      accessor: (part) => <span className="font-bold text-primary">${part.unitCost?.toFixed(2) || '0.00'}</span>,
      rtlOrder: 5
    },
    { 
      header: t('actions'), 
      accessor: (part) => (
        <div className="flex justify-end gap-2">
           <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 gap-1 px-2 border border-transparent hover:border-amber-500/20 hover:text-amber-500 transition-all"
            onClick={(e) => {
              e.stopPropagation();
              if (user?.roleName === 'MAINTENANCE_MANAGER' || user?.roleName === 'ADMIN') {
                setSelectedPartForDirectAdd(part.partId)
                setDirectAddQty(10)
                setIsDirectAddDialogOpen(true)
              } else {
                setSelectedPartForRestock(part.partId)
                setRestockQty(10)
                setIsRestockDialogOpen(true)
              }
            }}
           >
            <History className="h-4 w-4" />
            {user?.roleName === 'MAINTENANCE_MANAGER' || user?.roleName === 'ADMIN' ? t('addDirectly') : t('restock')}
           </Button>
           <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
             <Edit2 className="h-4 w-4" />
           </Button>
        </div>
      ),
      className: "text-right",
      rtlOrder: 0
    }
  ]

  const renderMobileCard = (part: SparePartResponse) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-sm text-foreground">{part.name}</h3>
          <p className="text-[10px] text-muted-foreground">{part.category} • {part.sku}</p>
        </div>
        {getStockBadge(part)}
      </div>
      <div className="flex items-center justify-between py-2 border-y border-border/50">
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground uppercase">{t('status')}</p>
          <p className="font-bold text-sm">{part.quantityInStock}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground uppercase">{t('location')}</p>
          <p className="font-medium text-xs">{part.location || 'N/A'}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground uppercase">{t('unitCost')}</p>
          <p className="font-bold text-sm text-primary">${part.unitCost?.toFixed(2)}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button 
          className="flex-1 h-8 text-xs bg-primary/10 text-primary hover:bg-primary/20 border-none"
          onClick={() => {
            if (user?.roleName === 'MAINTENANCE_MANAGER' || user?.roleName === 'ADMIN') {
              setSelectedPartForDirectAdd(part.partId)
              setIsDirectAddDialogOpen(true)
            } else {
              setSelectedPartForRestock(part.partId)
              setIsRestockDialogOpen(true)
            }
          }}
        >
          {user?.roleName === 'MAINTENANCE_MANAGER' || user?.roleName === 'ADMIN' ? t('addDirectly') : t('restock')}
        </Button>
      </div>
    </div>
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-base font-semibold text-foreground">{t('sparePartsInventory')}</h1>
        <div className="flex gap-1.5">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-7 gap-1.5 bg-primary">
                <Plus className="h-3 w-3" />
                {t('addSparePart')}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] bg-card/95 backdrop-blur-xl border-border shadow-2xl text-foreground">
              <DialogHeader>
                <DialogTitle>{t('registerSparePart')}</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  {t('enrollNewItem')}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">{t('partName')}</label>
                    <Input 
                      required 
                      placeholder="e.g. MRI Cooling Fan" 
                      value={newPart.name}
                      onChange={(e) => setNewPart({...newPart, name: e.target.value})}
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">{t('skuReference')}</label>
                    <Input 
                      required 
                      placeholder="REF-123456" 
                      value={newPart.sku}
                      onChange={(e) => setNewPart({...newPart, sku: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">{t('category')}</label>
                    <Input 
                      placeholder="e.g. Mechanical" 
                      value={newPart.category}
                      onChange={(e) => setNewPart({...newPart, category: e.target.value})}
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">{t('unitCost')}</label>
                    <Input 
                      type="number"
                      step="0.01"
                      value={newPart.unitCost}
                      onChange={(e) => setNewPart({...newPart, unitCost: parseFloat(e.target.value)})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">{t('initialStock')}</label>
                    <Input 
                      type="number"
                      required
                      value={newPart.quantityInStock}
                      onChange={(e) => setNewPart({...newPart, quantityInStock: parseInt(e.target.value)})}
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">{t('alertLevel')}</label>
                    <Input 
                      type="number"
                      required
                      value={newPart.minStockLevel}
                      onChange={(e) => setNewPart({...newPart, minStockLevel: parseInt(e.target.value)})}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">{t('storageLocation')}</label>
                  <Input 
                    placeholder="Shelf B-12" 
                    value={newPart.location}
                    onChange={(e) => setNewPart({...newPart, location: e.target.value})}
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>{t('cancel')}</Button>
                  <Button type="submit" className="bg-primary text-primary-foreground">{t('save')}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className="grid gap-2 grid-cols-2 lg:grid-cols-4">
        {[
          { label: t('totalValuation'), value: `$${valuation.toLocaleString(undefined, { minimumFractionDigits: 0 })}`, icon: DollarSign, color: "text-success", bg: "bg-success/10" },
          { label: t('lowStock') || "Low Stock", value: parts.filter(p => p.quantityInStock <= p.minStockLevel).length, icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
          { label: t('pendingRestocks') || "Pending Restocks", value: pendingRestocks.length, icon: Truck, color: "text-warning", bg: "bg-warning/10" },
          { label: t('stockIntegrity'), value: "100%", icon: CheckCircle, color: "text-info", bg: "bg-info/10" },
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

      {(user?.roleName === 'ADMIN' || user?.roleName === 'MAINTENANCE_MANAGER') && pendingRestocks.length > 0 && (
        <Card className="border-warning/20 bg-warning/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('pendingReview')}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {pendingRestocks.map(req => {
                const part = parts.find(p => p.partId === req.partId)
                return (
                  <div key={req.requestId} className="flex items-center justify-between p-2 rounded border border-warning/10 bg-background/50">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-warning" />
                      <div>
                        <p className="text-xs font-medium">{part?.name || 'Unknown'} (x{req.quantity})</p>
                        <p className="text-[9px] text-muted-foreground">{new Date(req.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-6 text-xs text-destructive" onClick={() => handleRejectRestock(req.requestId)}>{t('decline')}</Button>
                      <Button size="sm" className="h-6 text-xs bg-warning hover:bg-warning/90" onClick={() => { setSelectedRequestForApproval(req); setApprovalQty(req.quantity); setIsApprovalDialogOpen(true); }}>{t('approve')}</Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className={cn("absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground", isRtl ? "right-2" : "left-2")} />
          <Input 
            placeholder={t('searchByNameOrSKU')} 
            className={cn("h-7 text-xs", isRtl ? "pr-7" : "pl-7")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
              <Filter className="h-3 w-3" />
              {categoryFilter === 'all' ? t('allCategories') : categoryFilter}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => setCategoryFilter("all")}>{t('allCategories')}</DropdownMenuItem>
            {categories.map(cat => (
              <DropdownMenuItem key={cat} onClick={() => setCategoryFilter(cat)}>{cat}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Card>
        <CardContent className="p-0">
          <ResponsiveDataTable
            columns={columns}
            data={paginatedParts}
            renderCard={renderMobileCard}
            isLoading={isLoading}
            emptyMessage={t('noData')}
            className="border-none"
          />
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t p-4">
              <p className="text-sm text-muted-foreground">
                {t('showing')} <span className="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span> {t('to')} <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredParts.length)}</span> {t('of')} <span className="font-medium">{filteredParts.length}</span> {t('results')}
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

      <Dialog open={isRestockDialogOpen} onOpenChange={setIsRestockDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('restock')}</DialogTitle>
            <DialogDescription>
              {language === 'ar' ? 'طلب تجديد المخزون لهذه القطعة.' : 'Request stock replenishment for this item.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">{language === 'ar' ? 'الكمية' : 'Quantity'}</label>
              <Input 
                type="number" 
                value={restockQty}
                onChange={(e) => setRestockQty(parseInt(e.target.value))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
             <Button variant="outline" onClick={() => setIsRestockDialogOpen(false)}>{t('cancel')}</Button>
             <Button onClick={handleCreateRestock} className="bg-primary text-primary-foreground">{t('submit')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('approve')}</DialogTitle>
            <DialogDescription>
              {t('confirmReceipt')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">{t('arrivalQuantity')}</label>
              <Input 
                type="number" 
                value={approvalQty}
                onChange={(e) => setApprovalQty(parseInt(e.target.value))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
             <Button variant="outline" onClick={() => setIsApprovalDialogOpen(false)}>{t('cancel')}</Button>
             <Button onClick={handleApproveRestock} className="bg-amber-600 text-white font-bold">{t('confirmAndAdd')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isDirectAddDialogOpen} onOpenChange={setIsDirectAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('quickStockAddition')}</DialogTitle>
            <DialogDescription>
              {language === 'ar' ? 'إضافة مباشرة للمخزون.' : 'Directly increment the stock level.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">{language === 'ar' ? 'الكمية' : 'Quantity'}</label>
              <Input 
                type="number" 
                value={directAddQty}
                onChange={(e) => setDirectAddQty(parseInt(e.target.value))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
             <Button variant="outline" onClick={() => setIsDirectAddDialogOpen(false)}>{t('cancel')}</Button>
             <Button onClick={handleDirectAddStock} className="bg-primary text-primary-foreground">{t('addDirectly')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
