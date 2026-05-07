"use client"

import React from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"

export interface Column<T> {
  header: string | React.ReactNode
  accessor: keyof T | ((item: T) => React.ReactNode)
  className?: string
  /** If true, this column is hidden on mobile and only shown in the card if mapped */
  hideOnMobile?: boolean
  /** Priority for column ordering in RTL if different from LTR */
  rtlOrder?: number
}

interface ResponsiveDataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  renderCard: (item: T) => React.ReactNode
  onRowClick?: (item: T) => void
  isLoading?: boolean
  emptyMessage?: string
  className?: string
  rowClassName?: string
}

export function ResponsiveDataTable<T>({
  columns,
  data,
  renderCard,
  onRowClick,
  isLoading,
  emptyMessage = "No data found",
  className,
  rowClassName,
}: ResponsiveDataTableProps<T>) {
  const { language } = useI18n()
  const isRtl = language === "ar"

  // Sort columns if rtlOrder is provided and we are in RTL mode
  const displayColumns = React.useMemo(() => {
    if (isRtl && columns.some((c) => c.rtlOrder !== undefined)) {
      return [...columns].sort((a, b) => (a.rtlOrder ?? 0) - (b.rtlOrder ?? 0))
    }
    return columns
  }, [columns, isRtl])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground animate-pulse">
          {language === "ar" ? "جاري التحميل..." : language === "fr" ? "Chargement..." : "Loading..."}
        </p>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className={cn("w-full", className)}>
      {/* Desktop/Tablet View */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {displayColumns.map((col, i) => (
                <TableHead key={i} className={col.className}>
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item, rowIndex) => (
              <TableRow
                key={rowIndex}
                className={cn(onRowClick && "cursor-pointer hover:bg-muted/30", rowClassName)}
                onClick={() => onRowClick?.(item)}
              >
                {displayColumns.map((col, colIndex) => (
                  <TableCell key={colIndex} className={col.className}>
                    {typeof col.accessor === "function"
                      ? col.accessor(item)
                      : (item[col.accessor] as React.ReactNode)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile View - Cards */}
      <div className="md:hidden space-y-3">
        {data.map((item, i) => (
          <div
            key={i}
            onClick={() => onRowClick?.(item)}
            className={cn(
              "bg-card border rounded-lg p-4 shadow-sm",
              onRowClick && "active:scale-[0.98] transition-transform"
            )}
          >
            {renderCard(item)}
          </div>
        ))}
      </div>
    </div>
  )
}
