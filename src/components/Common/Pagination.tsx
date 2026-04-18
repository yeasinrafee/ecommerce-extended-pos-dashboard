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
    <div className=" w-full flex flex-col sm:flex-row md:items-center justify-between gap-4">
      <div>
        {totalItems !== undefined && itemsPerPage !== undefined && (
          <div className="text-sm text-muted-foreground w-full">
            Showing{" "}
            {Math.min(
              itemsPerPage,
              totalItems - (currentPage - 1) * itemsPerPage
            )}{" "}
            of {totalItems} items
          </div>
        )}
      </div>
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