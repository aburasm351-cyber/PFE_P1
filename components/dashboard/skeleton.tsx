"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 pb-20 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-4 items-center">
          <Skeleton className="h-14 w-14 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-28 rounded-xl" />
          <Skeleton className="h-10 w-28 rounded-xl" />
        </div>
      </div>

      {/* Stats Grid Skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="border-none bg-card/40 backdrop-blur-md ring-1 ring-border">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-8 w-16" />
              </div>
              <Skeleton className="h-12 w-12 rounded-2xl" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Grid Skeleton */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="border-none bg-card/40 backdrop-blur-md ring-1 ring-border h-[600px]">
            <CardHeader className="border-b border-border/40">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent className="p-6 space-y-6">
               {[1, 2, 3, 4, 5].map(i => (
                 <div key={i} className="flex gap-4">
                    <Skeleton className="h-10 w-10 rounded-xl" />
                    <div className="flex-1 space-y-2">
                       <div className="flex justify-between">
                          <Skeleton className="h-4 w-1/3" />
                          <Skeleton className="h-3 w-12" />
                       </div>
                       <Skeleton className="h-3 w-full" />
                    </div>
                 </div>
               ))}
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
           <Card className="border-none bg-card/40 backdrop-blur-md ring-1 ring-border h-[250px]">
              <CardContent className="p-6 space-y-4">
                 <Skeleton className="h-4 w-20" />
                 <Skeleton className="h-10 w-3/4" />
                 <Skeleton className="h-2 w-full" />
                 <Skeleton className="h-10 w-full rounded-xl mt-4" />
              </CardContent>
           </Card>
           <Card className="border-none bg-card/40 backdrop-blur-md ring-1 ring-border h-[250px] bg-primary/5">
              <CardContent className="p-6 space-y-4">
                 <Skeleton className="h-12 w-12 rounded-full mx-auto" />
                 <Skeleton className="h-4 w-24 mx-auto" />
                 <Skeleton className="h-6 w-3/4 mx-auto" />
              </CardContent>
           </Card>
        </div>
      </div>
    </div>
  )
}
