"use client";
import React, { useEffect, useMemo, useState } from "react";
import {
  Table as UITable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PaginationControl } from "@/components/Common/Pagination";

type Align = "left" | "center" | "right";

export type Column<T = Record<string, unknown>> = {
  header: React.ReactNode;
  accessor?: string;
  cell?: (row: T) => React.ReactNode;
  className?: string;
  align?: Align;
  width?: string | number;
};

type Props<T = Record<string, unknown>> = {
  columns: Column<T>[];
  data: T[];
  pageSize?: number;
  searchKeys?: string[];
  toolbar?: React.ReactNode; 
  renderRowActions?: (row: T) => React.ReactNode;
  rowKey?: string;
  showIndex?: boolean;
  emptyState?: React.ReactNode;
  className?: string;
  onSearch?: (term: string) => void; 
  serverSide?: boolean;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  totalItems?: number;
  
  searchTerm?: string; 
};

function getValue(obj: any, path?: string) {
  if (!path) return undefined;
  return path.split(".").reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
}

export default function Table<T = Record<string, unknown>>({
  columns,
  data,
  pageSize = 10,
  searchKeys,
  toolbar,
  renderRowActions,
  rowKey = "id",
  showIndex = true,
  emptyState,
  className,
  onSearch,
  serverSide = false,
  currentPage: currentPageProp,
  onPageChange,
  totalItems,
  searchTerm,
}: Props<T>) {
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = useMemo(() => {
    if (serverSide) return data;
    if (!searchTerm || onSearch) return data;
    const term = searchTerm.toLowerCase();
    return data.filter((row) => {
      const keys = searchKeys && searchKeys.length ? searchKeys : Object.keys(row as object);
      return keys.some((k) => {
        const val = getValue(row, String(k));
        return val !== undefined && String(val).toLowerCase().includes(term);
      });
    });
  }, [data, searchTerm, searchKeys, onSearch, serverSide]);

  const totalPages = serverSide && typeof totalItems === "number" ? Math.max(1, Math.ceil(totalItems / pageSize)) : Math.max(1, Math.ceil(filtered.length / pageSize));

  useEffect(() => {
    if (serverSide) return;
    if (currentPage > totalPages) setCurrentPage(1);
  }, [totalPages, currentPage, serverSide]);

  const effectivePage = serverSide ? (currentPageProp || 1) : currentPage;
  const startIndex = (effectivePage - 1) * pageSize;
  const paginated = serverSide ? data : filtered.slice(startIndex, startIndex + pageSize);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    if (serverSide) {
      onPageChange?.(page);
    } else {
      setCurrentPage(page);
    }
  };

  return (
    <div className={`bg-background p-3 ${className || ""}`}>
      <div className="flex flex-col md:flex-row justify-between gap-2 mb-2">
        <div className="w-full max-w-sm">{toolbar}</div>
      </div>

      <div className="rounded-sm border">
        <UITable>
          <TableHeader>
            <TableRow className="bg-gray-50">
              {showIndex && <TableHead className="w-10 text-center">SL</TableHead>}
              {columns.map((col, i) => (
                <TableHead
                  key={i}
                  className={col.className}
                  style={{ textAlign: col.align || "left", width: col.width }}
                >
                  {col.header}
                </TableHead>
              ))}
              {renderRowActions && <TableHead className="text-center">Actions</TableHead>}
            </TableRow>
          </TableHeader>

          <TableBody>
            {paginated.map((row, rowIndex) => (
              <TableRow key={String((row as any)[rowKey]) || rowIndex}>
                {showIndex && <TableCell className="text-center">{startIndex + rowIndex + 1}</TableCell>}
                {columns.map((col, ci) => (
                  <TableCell key={ci} className={col.className} style={{ textAlign: col.align || "left" }}>
                    {col.cell ? col.cell(row) : String(getValue(row as any, col.accessor || "") ?? "")}
                  </TableCell>
                ))}
                {renderRowActions && <TableCell className="text-center">{renderRowActions(row)}</TableCell>}
              </TableRow>
            ))}

            {paginated.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length + (showIndex ? 1 : 0) + (renderRowActions ? 1 : 0)} className="text-center">
                  {emptyState || "No records found."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </UITable>
      </div>

      <div className="pl-2 pt-4">
        <PaginationControl
          currentPage={effectivePage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          totalItems={serverSide ? (totalItems ?? 0) : filtered.length}
          itemsPerPage={pageSize}
        />
      </div>
    </div>
  );
}
