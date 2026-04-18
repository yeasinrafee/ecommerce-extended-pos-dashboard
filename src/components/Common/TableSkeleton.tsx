import React from "react";
import {
  Table as UITable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

interface TableSkeletonProps {
  columns?: number;
  rowCount?: number;
  showIndex?: boolean;
  className?: string;
}

export default function TableSkeleton({
  columns = 5,
  rowCount = 10,
  showIndex = true,
  className = "",
}: TableSkeletonProps) {
  return (
    <div className={`bg-background p-3 w-full overflow-hidden ${className}`}>
      <div className="rounded-sm border overflow-x-auto w-full max-w-full">
        <UITable className="w-full">
          <TableHeader>
            <TableRow className="bg-gray-50">
              {showIndex && (
                <TableHead className="w-10 text-center">
                  <Skeleton className="h-4 w-4 mx-auto" />
                </TableHead>
              )}
              {Array.from({ length: columns }).map((_, i) => (
                <TableHead key={i}>
                  <Skeleton className="h-4 w-[60%] max-w-[120px]" />
                </TableHead>
              ))}
              <TableHead className="text-center w-20">
                <Skeleton className="h-4 w-12 mx-auto" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: rowCount }).map((_, rowIndex) => (
              <TableRow key={rowIndex}>
                {showIndex && (
                  <TableCell className="text-center">
                    <Skeleton className="h-4 w-4 mx-auto" />
                  </TableCell>
                )}
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <TableCell key={colIndex}>
                    <Skeleton className="h-8 w-[80%] min-w-[80px]" />
                  </TableCell>
                ))}
                <TableCell className="text-center flex justify-center">
                  <Skeleton className="h-6 w-8 rounded-md mx-auto mt-1" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </UITable>
      </div>

      <div className="pl-2 pt-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <Skeleton className="h-4 w-40" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-10" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
    </div>
  );
}
