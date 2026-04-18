import React from 'react'
import { Skeleton } from "@/components/ui/skeleton"

interface WebFormSkeletonProps {
  fields?: number;
  hasBanner?: boolean;
}

const WebFormSkeleton = ({ fields = 4, hasBanner = true }: WebFormSkeletonProps) => {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 bg-background rounded-xl shadow-sm border border-slate-200">
      <div className="space-y-2">
        <Skeleton className="h-8 w-1/3 lg:w-1/4" />
        <Skeleton className="h-4 w-1/2 lg:w-1/3" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {hasBanner && (
          <div className="space-y-4 md:col-span-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-40 w-full rounded-xl border-2 border-dashed border-slate-100" />
          </div>
        )}

        {[...Array(fields)].map((_, i) => (
          <div key={i} className={i >= fields - 2 ? "md:col-span-2 space-y-2" : "space-y-2"}>
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        ))}

        <div className="md:col-span-2 space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-32 w-full rounded-md" />
        </div>
      </div>

      <div className="flex justify-center pt-4 border-t border-slate-100">
        <Skeleton className="h-11 w-full md:max-w-[300px] rounded-md" />
      </div>
    </div>
  )
}

export default WebFormSkeleton