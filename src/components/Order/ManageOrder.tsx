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
} from "@/hooks/order.api";
import type { Order } from "@/hooks/order.api";
import CustomSelect from "@/components/FormFields/CustomSelect";
import CustomCheckbox from "@/components/FormFields/CustomCheckbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCompanyInformation } from "@/hooks/web.api";
import { generateInvoice } from "@/utils/generateInvoice";

export default function ManageOrder() {
  const router = useRouter();
  const [page, setPage] = React.useState(1);
  const limit = 10;

  const [searchInput, setSearchInput] = React.useState("");
  const [searchTerm, setSearchTerm] = React.useState<string | undefined>(
    undefined,
  );

  React.useEffect(() => {
    const handle = setTimeout(() => {
      setPage(1);
      setSearchTerm(searchInput.trim() || undefined);
    }, 500);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const { data, isLoading, error } = useOrders({ page, limit, searchTerm });
  const updateStatusMutation = useUpdateOrderStatus();
  const bulkUpdateMutation = useBulkUpdateOrderStatus();
  const { data: companyInfo } = useCompanyInformation();

  const items = data?.data ?? [];

  // console.log("order data", items);

  const [optimisticStatus, setOptimisticStatus] = React.useState<
    Record<
      string,
      "PENDING" | "CONFIRMED" | "SHIPPED" | "DELIVERED" | "CANCELLED"
    >
  >({});
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
    items.forEach((it: { id: string }) => {
      newSel[it.id] = true;
    });
    setSelected(newSel);
  };

  const clearSelection = () => setSelected({});

  const handleInlineStatusChange = (
    id: string,
    status: "PENDING" | "CONFIRMED" | "SHIPPED" | "DELIVERED" | "CANCELLED",
  ) => {
    const prev = items.find(
      (it: {
        id: string;
        orderStatus?:
          | "PENDING"
          | "CONFIRMED"
          | "SHIPPED"
          | "DELIVERED"
          | "CANCELLED";
      }) => it.id === id,
    )?.orderStatus;
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
  }, [bulkStatus]);

  const applyBulkStatus = () => {
    if (selectedIds.length === 0) return;
    const prev: Record<string, any> = {};
    selectedIds.forEach((id) => {
      prev[id] =
        optimisticStatus[id] ??
        items.find((it: Order) => it.id === id)?.orderStatus;
    });

    setOptimisticStatus((s) => {
      const copy = { ...s };
      selectedIds.forEach((id) => (copy[id] = bulkStatus as any));
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

  const statusOptions = [
    { label: "Pending", value: "PENDING" },
    { label: "Confirmed", value: "CONFIRMED" },
    { label: "Shipped", value: "SHIPPED" },
    { label: "Delivered", value: "DELIVERED" },
    { label: "Cancelled", value: "CANCELLED" },
  ];

  const columns = React.useMemo<Column<Order>[]>(
    () => [
      {
        header: (
          <div className="flex items-center justify-center gap-2">
            <CustomCheckbox
              checked={
                items.length > 0 && items.every((it: Order) => selected[it.id])
              }
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
            onCheckedChange={(v) =>
              setSelected((s) => ({ ...s, [row.id]: !!v }))
            }
          />
        ),
        className: "w-12 text-center",
      },
      {
        header: "Order #",
        cell: (row) => (
          <span className="font-medium text-sm">{row.id.slice(0, 8)}</span>
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
          <span className="text-xs text-muted-foreground">
            {row.customerEmail ?? "N/A"}
          </span>
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
        header: "Delivery Time",
        cell: (row) => (
          <span className="text-xs font-medium">
            {row.deliveryTime != null ? `${row.deliveryTime} days` : "N/A"}
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
        cell: (row) => (
          <InlineStatusSelect
            value={optimisticStatus[row.id] ?? row.orderStatus}
            onChange={(s) => handleInlineStatusChange(row.id, s as any)}
            options={statusOptions}
          />
        ),
        align: "center",
        className: "w-48",
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
      case 1:
        return `${day}st`;
      case 2:
        return `${day}nd`;
      case 3:
        return `${day}rd`;
      default:
        return `${day}th`;
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
    // console.log("Generating invoice for:", order.id);
  };

  return (
    <div>
      <h2 className="mb-4 text-xl font-bold tracking-tight">
        Order Management
      </h2>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <SearchBar
          searchInput={searchInput}
          setSearchInput={setSearchInput}
          clearSearch={() => setSearchInput("")}
        />

        <div className="flex items-center gap-2">
          <CustomSelect
            name="status"
            control={bulkForm.control}
            options={statusOptions}
            valueToField={(v) => v}
            fieldToValue={(v) => v}
            onChangeCallback={(v: string) => setBulkStatus(v)}
            placeholder="Bulk status"
            triggerClassName="w-40 min-h-10 bg-background"
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
          <p className="text-destructive font-semibold">
            Failed to load orders
          </p>
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
          renderRowActions={(row) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
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
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        />
      )}
    </div>
  );
}

function InlineStatusSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
}) {
  const { control, reset } = useForm<{ status: string }>({
    defaultValues: { status: value },
  });
  const [val, setVal] = React.useState<string>(value);
  const timerRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    reset({ status: value });
    setVal(value);
  }, [value, reset]);

  React.useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const handleChange = (v: string) => {
    setVal(v);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      onChange(v);
      timerRef.current = null;
    }, 500);
  };

  return (
    <CustomSelect
      name={"status"}
      control={control}
      options={options}
      fieldToValue={(v: any) => v ?? ""}
      valueToField={(v: string) => v}
      onChangeCallback={handleChange}
      placeholder="Status"
      triggerClassName="w-32 border border-slate-300 h-8"
    />
  );
}
