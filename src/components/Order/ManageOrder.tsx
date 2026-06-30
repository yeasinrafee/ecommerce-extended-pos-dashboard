"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Table, { type Column } from "@/components/Common/Table";
import TableSkeleton from "@/components/Common/TableSkeleton";
import CustomButton from "@/components/Common/CustomButton";
import SearchBar from "@/components/FormFields/SearchBar";
import { useForm } from "react-hook-form";
import {
  useOrders,
  useUpdateOrderStatus,
  useBulkUpdateOrderStatus,
  useCompleteOrder,
  type Order,
  type OrderStatus,
} from "@/hooks/order.api";
import CustomSelect from "@/components/FormFields/CustomSelect";
import CustomCheckbox from "@/components/FormFields/CustomCheckbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Download, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCompanyInformation } from "@/hooks/web.api";
import { generateInvoice } from "@/utils/generateInvoice";

const STATUS_OPTIONS: { label: string; value: OrderStatus }[] = [
  { label: "Pending", value: "PENDING" },
  { label: "Sale", value: "SALE" },
  { label: "Returned", value: "RETURNED" },
];

const STATUS_FILTER_OPTIONS = [
  { label: "All Statuses", value: "" },
  ...STATUS_OPTIONS,
];

const STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING:  "bg-amber-100 text-amber-700 border-amber-200",
  SALE:     "bg-emerald-100 text-emerald-700 border-emerald-200",
  RETURNED: "bg-rose-100 text-rose-600 border-rose-200",
};

export default function ManageOrder() {
  const router = useRouter();
  const [page, setPage] = React.useState(1);
  const limit = 10;

  const [searchInput, setSearchInput] = React.useState("");
  const [searchTerm, setSearchTerm] = React.useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter] = React.useState<OrderStatus | "">("");

  React.useEffect(() => {
    const handle = setTimeout(() => {
      setPage(1);
      setSearchTerm(searchInput.trim() || undefined);
    }, 500);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const { data, isLoading, error } = useOrders({
    page,
    limit,
    searchTerm,
    status: statusFilter || undefined,
  });

  const updateStatusMutation = useUpdateOrderStatus();
  const bulkUpdateMutation = useBulkUpdateOrderStatus();
  const completeOrderMutation = useCompleteOrder();
  const { data: companyInfo } = useCompanyInformation();

  const items: Order[] = data?.data ?? [];

  const [optimisticStatus, setOptimisticStatus] = React.useState<Record<string, OrderStatus>>({});
  const [selected, setSelected] = React.useState<Record<string, boolean>>({});
  const selectedIds = React.useMemo(
    () => Object.keys(selected).filter((k) => selected[k]),
    [selected],
  );

  const toggleSelect = (id: string) => {
    setSelected((s) => ({ ...s, [id]: !s[id] }));
  };

  const selectAllOnPage = () => {
    const newSel: Record<string, boolean> = { ...selected };
    items.forEach((it) => { newSel[it.id] = true; });
    setSelected(newSel);
  };

  const clearSelection = () => setSelected({});

  const handleInlineStatusChange = (id: string, status: OrderStatus) => {
    const prev = items.find((it) => it.id === id)?.orderStatus;
    setOptimisticStatus((s) => ({ ...s, [id]: status }));
    updateStatusMutation.mutate(
      { id, status },
      {
        onError: () => {
          setOptimisticStatus((s) => {
            const copy = { ...s };
            if (prev === undefined) delete copy[id];
            else copy[id] = prev;
            return copy;
          });
        },
        onSuccess: () => {
          setOptimisticStatus((s) => {
            const copy = { ...s };
            delete copy[id];
            return copy;
          });
        },
      },
    );
  };

  const [bulkStatus, setBulkStatus] = React.useState<string>("PENDING");
  const bulkForm = useForm<{ status: string }>({
    defaultValues: { status: bulkStatus },
  });

  React.useEffect(() => {
    bulkForm.reset({ status: bulkStatus });
  }, [bulkStatus, bulkForm]);

  const applyBulkStatus = () => {
    if (selectedIds.length === 0) return;
    const prev: Record<string, any> = {};
    selectedIds.forEach((id) => {
      prev[id] = optimisticStatus[id] ?? items.find((it) => it.id === id)?.orderStatus;
    });
    setOptimisticStatus((s) => {
      const copy = { ...s };
      selectedIds.forEach((id) => (copy[id] = bulkStatus as OrderStatus));
      return copy;
    });
    bulkUpdateMutation.mutate(
      { ids: selectedIds, status: bulkStatus },
      {
        onSuccess: () => {
          clearSelection();
          setOptimisticStatus((s) => {
            const copy = { ...s };
            selectedIds.forEach((id) => delete copy[id]);
            return copy;
          });
        },
        onError: () => {
          setOptimisticStatus((s) => {
            const copy = { ...s };
            selectedIds.forEach((id) => {
              const p = prev[id];
              if (p === undefined) delete copy[id];
              else copy[id] = p;
            });
            return copy;
          });
        },
      },
    );
  };

  const handleCompleteOrder = (id: string) => {
    completeOrderMutation.mutate(id);
  };

  const columns = React.useMemo<Column<Order>[]>(
    () => [
      {
        header: (
          <div className="flex items-center justify-center gap-2">
            <CustomCheckbox
              checked={items.length > 0 && items.every((it) => selected[it.id])}
              onCheckedChange={(v) => {
                if (v) selectAllOnPage();
                else clearSelection();
              }}
            />
            <span className="text-sm">Select</span>
          </div>
        ),
        cell: (row) => (
          <CustomCheckbox
            checked={!!selected[row.id]}
            onCheckedChange={(v) => setSelected((s) => ({ ...s, [row.id]: !!v }))}
          />
        ),
        className: "w-12 text-center",
      },
      {
        header: "Order #",
        cell: (row) => (
          <span className="font-medium text-sm font-mono">{row.id.slice(0, 8)}</span>
        ),
      },
      {
        header: "Name",
        accessor: "customerName",
        cell: (row) => (
          <span className="text-xs font-semibold">{row.customerName}</span>
        ),
      },
      {
        header: "Email",
        cell: (row) => (
          <span className="text-xs text-muted-foreground">{row.customerEmail ?? "N/A"}</span>
        ),
      },
      {
        header: "Zone",
        cell: (row) => (
          <span className="text-xs text-muted-foreground">
            {row.address?.zone?.name ?? "N/A"}
          </span>
        ),
      },
      {
        header: "Total Amount",
        cell: (row) => (
          <span className="font-semibold text-primary underline decoration-slate-200 underline-offset-4 decoration-dotted">
            ${row.finalAmount.toFixed(2)}
          </span>
        ),
        align: "center",
      },
      {
        header: "Status",
        cell: (row) => {
          const currentStatus = optimisticStatus[row.id] ?? row.orderStatus;
          return (
            <Badge
              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${STATUS_COLORS[currentStatus] ?? "bg-slate-100 text-slate-600"}`}
            >
              {currentStatus}
            </Badge>
          );
        },
        align: "center",
        className: "w-32",
      },
      {
        header: "Placed At",
        accessor: "createdAt",
        cell: (row) => formatFriendlyDate(row.createdAt),
      },
    ],
    [items, selected, optimisticStatus],
  );

  const getOrdinalDay = (day: number) => {
    if (day > 3 && day < 21) return `${day}th`;
    switch (day % 10) {
      case 1: return `${day}st`;
      case 2: return `${day}nd`;
      case 3: return `${day}rd`;
      default: return `${day}th`;
    }
  };

  const formatFriendlyDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return "Invalid date";
    const month = date.toLocaleString("default", { month: "short" });
    const day = getOrdinalDay(date.getDate());
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const handleView = (id: string) => {
    router.push(`/dashboard/orders/${id}`);
  };

  const handleDownloadInvoice = (row: Order, e: React.MouseEvent) => {
    e.stopPropagation();
    generateInvoice(row, { download: true }, companyInfo);
  };

  return (
    <div>
      <h2 className="mb-4 text-xl font-bold tracking-tight">Order Management</h2>

      {/* Search + Filters Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
        <SearchBar
          searchInput={searchInput}
          setSearchInput={setSearchInput}
          clearSearch={() => setSearchInput("")}
        />

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as any); setPage(1); }}
            className="h-10 border border-slate-200 bg-background text-sm rounded-md px-3 outline-none focus:ring-2 focus:ring-primary/20 min-w-[140px]"
          >
            {STATUS_FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Bulk Status Change */}
          <CustomSelect
            name="status"
            control={bulkForm.control}
            options={STATUS_OPTIONS}
            valueToField={(v) => v}
            fieldToValue={(v) => v}
            onChangeCallback={(v: string) => setBulkStatus(v)}
            placeholder="Bulk status"
            triggerClassName="w-36 min-h-10 bg-background"
          />
          <CustomButton
            disabled={selectedIds.length === 0}
            onClick={applyBulkStatus}
            loading={bulkUpdateMutation.isPending}
          >
            Change Status
          </CustomButton>
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton columns={6} showIndex={false} />
      ) : error ? (
        <div className="text-center py-20 bg-destructive/5 rounded-xl border border-destructive/20 border-dashed">
          <p className="text-destructive font-semibold">Failed to load orders</p>
          <Button variant="link" onClick={() => window.location.reload()}>
            Try again
          </Button>
        </div>
      ) : (
        <Table<Order>
          columns={columns}
          data={items}
          rowKey="id"
          pageSize={limit}
          serverSide
          currentPage={page}
          totalItems={Number(data?.meta?.total ?? 0)}
          onPageChange={setPage}
          renderRowActions={(row) => {
            const currentStatus = optimisticStatus[row.id] ?? row.orderStatus;
            return (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={() => handleView(row.id)}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Eye className="h-4 w-4 text-primary" />
                    <span>View Details</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => handleDownloadInvoice(row, e)}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Download className="h-4 w-4 text-slate-500" />
                    <span>Get Invoice</span>
                  </DropdownMenuItem>
                  {currentStatus === "PENDING" && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleCompleteOrder(row.id)}
                        disabled={completeOrderMutation.isPending}
                        className="flex items-center gap-2 cursor-pointer text-emerald-600 focus:text-emerald-700 focus:bg-emerald-50"
                      >
                        <CheckCircle className="h-4 w-4" />
                        <span>Complete (→ SALE)</span>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          }}
        />
      )}
    </div>
  );
}
