"use client";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface PaginationControlProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  itemsPerPage?: number;
  onLimitChange?: (limit: number) => void;
}

export function PaginationControl({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
}: PaginationControlProps) {
  const getPaginationItems = () => {
    const items = [];
    const maxVisiblePages = 5;

    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink
            isActive={currentPage === i}
            onClick={() => onPageChange(i)}
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }

    return items;
  };

  return (
    <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      {/* Left side: entry count */}
      <div className="flex items-center gap-3">
        {totalItems !== undefined && itemsPerPage !== undefined && (
          <span className="text-xs text-slate-500">
            {(() => {
              const start = Math.max(0, (currentPage - 1) * itemsPerPage) + 1;
              const end = Math.min(currentPage * itemsPerPage, totalItems);
              return totalItems === 0 ? '0 entries' : `${start}–${end} of ${totalItems} entries`;
            })()}
          </span>
        )}
      </div>

      {/* Right side: page navigation */}
      <div>
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => onPageChange(currentPage - 1)}
                className={
                  currentPage === 1
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
              />
            </PaginationItem>

            {getPaginationItems()}

            <PaginationItem>
              <PaginationNext
                onClick={() => onPageChange(currentPage + 1)}
                className={
                  currentPage === totalPages
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}
