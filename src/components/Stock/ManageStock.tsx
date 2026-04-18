"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import Table, { type Column } from "@/components/Common/Table";
import TableSkeleton from "@/components/Common/TableSkeleton";
import CustomButton from "@/components/Common/CustomButton";
import DeleteModal from "@/components/Common/DeleteModal";
import SearchBar from "@/components/FormFields/SearchBar";
import CustomSelect from "@/components/FormFields/CustomSelect";
import {
  useBulkPatchStocks,
  useDeleteStock,
  usePaginatedStocks,
  usePatchStock,
  type Stock,
  type StockOrderStatus
} from "@/hooks/stock.api";

const statusOptions = [
  { label: "Pending", value: "PENDING" },
  { label: "Confirmed", value: "CONFIRMED" },
  { label: "Shipped", value: "SHIPPED" },
  { label: "Delivered", value: "DELIVERED" },
  { label: "Cancelled", value: "CANCELLED" }
];

const formatStockDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
};

const formatMoney = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  }).format(value);
};

const formatOrderStatus = (status: StockOrderStatus) => {
  return status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/(^\w|\s\w)/g, (m) => m.toUpperCase());
};

export default function ManageStock() {
  const router = useRouter();
  const [page, setPage] = React.useState(1);
  const limit = 10;

  const [searchInput, setSearchInput] = React.useState("");
  const [searchTerm, setSearchTerm] = React.useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter] = React.useState<StockOrderStatus | undefined>(undefined);
  const [bulkOrderStatus, setBulkOrderStatus] = React.useState("");
  const [selected, setSelected] = React.useState<Record<string, boolean>>({});
  const selectedIds = React.useMemo(() => Object.keys(selected).filter((id) => selected[id]), [selected]);

  const bulkStatusForm = useForm<{ orderStatus: string }>({
    defaultValues: {
      orderStatus: ""
    }
  });

  React.useEffect(() => {
    const handle = window.setTimeout(() => {
      setPage(1);
      setSearchTerm(searchInput.trim() || undefined);
    }, 500);

    return () => window.clearTimeout(handle);
  }, [searchInput]);

  const { data, isLoading, error } = usePaginatedStocks(page, limit, searchTerm, statusFilter);
  const deleteMutation = useDeleteStock();
  const patchMutation = usePatchStock();
  const bulkPatchMutation = useBulkPatchStocks();

  const [deleteTarget, setDeleteTarget] = React.useState<Stock | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [optimisticStatus, setOptimisticStatus] = React.useState<Record<string, StockOrderStatus>>({});

  const items = data?.data ?? [];

  const toggleSelect = (id: string) => {
    setSelected((current) => ({ ...current, [id]: !current[id] }));
  };

  const selectAllOnPage = () => {
    const nextSelection: Record<string, boolean> = { ...selected };
    items.forEach((item) => {
      nextSelection[item.id] = true;
    });
    setSelected(nextSelection);
  };

  const clearSelection = () => setSelected({});

  const applyBulkUpdate = () => {
    if (selectedIds.length === 0 || !bulkOrderStatus) return;

    bulkPatchMutation.mutate(
      {
        ids: selectedIds,
        orderStatus: bulkOrderStatus as StockOrderStatus
      },
      {
        onSuccess: () => {
          clearSelection();
          setBulkOrderStatus("");
          bulkStatusForm.reset({ orderStatus: "" });
        }
      }
    );
  };

  const goCreate = () => {
    router.push("/dashboard/stocks/create");
  };

  const goEdit = (id: string) => {
    router.push(`/dashboard/stocks/create?id=${id}`);
  };

  const handleDelete = (stock: Stock) => {
    setDeleteTarget(stock);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    await deleteMutation.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
    setDeleteModalOpen(false);
  };

  const handleStatusChange = (id: string, orderStatus: StockOrderStatus) => {
    const previous = items.find((item) => item.id === id)?.orderStatus;
    setOptimisticStatus((current) => ({ ...current, [id]: orderStatus }));

    patchMutation.mutate(
      { id, payload: { orderStatus } },
      {
        onSuccess: () => {
          setOptimisticStatus((current) => {
            const copy = { ...current };
            delete copy[id];
            return copy;
          });
        },
        onError: () => {
          setOptimisticStatus((current) => {
            const copy = { ...current };
            if (previous === undefined) {
              delete copy[id];
            } else {
              copy[id] = previous;
            }
            return copy;
          });
        }
      }
    );
  };

  const columns = React.useMemo<Column<Stock>[]>(
    () => [
      {
        header: (
          <div className="flex items-center justify-center gap-2">
            <input
              type="checkbox"
              checked={items.length > 0 && items.every((item) => selected[item.id])}
              onChange={(event) => {
                if (event.target.checked) {
                  selectAllOnPage();
                } else {
                  clearSelection();
                }
              }}
            />
            <span className="text-sm">Select</span>
          </div>
        ),
        cell: (row) => (
          <input
            type="checkbox"
            checked={!!selected[row.id]}
            onChange={() => toggleSelect(row.id)}
          />
        ),
        className: "w-12 text-center"
      },
      {
        header: "Invoice No",
        cell: (row) => (
          <button
            type="button"
            onClick={() => goEdit(row.id)}
            className="text-cyan-600 hover:text-cyan-700 font-medium"
          >
            {row.invoiceNumber}
          </button>
        )
      },
      {
        header: "Supplier",
        cell: (row) => row.supplier?.name ?? "-"
      },
      {
        header: "Store/Branch",
        cell: (row) => row.store?.name ?? "-"
      },
      {
        header: "Stock",
        cell: (row) => row.totalProductQuantity,
        align: "center"
      },
      {
        header: "Bill",
        cell: (row) => formatMoney(row.grandTotal),
        align: "right"
      },
      {
        header: "Status",
        cell: (row) => (
          <InlineStatusSelect
            value={optimisticStatus[row.id] ?? row.orderStatus}
            onChange={(value) => handleStatusChange(row.id, value)}
          />
        ),
        className: "w-44"
      },
      {
        header: "Date",
        cell: (row) => formatStockDate(row.createdAt)
      },
      {
        header: "Created By",
        cell: (row) => row.user?.admins?.[0]?.name ?? row.user?.email ?? "-"
      },
      {
        header: "Action",
        cell: (row) => (
          <div className="flex items-center justify-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4 text-slate-600" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-40">
                <DropdownMenuItem onClick={() => goEdit(row.id)}>
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={() => handleDelete(row)}>
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
        align: "center",
        className: "w-24"
      }
    ],
    [items, optimisticStatus, selected]
  );

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-medium">Manage Stock</h2>
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SearchBar
          searchInput={searchInput}
          setSearchInput={setSearchInput}
          clearSearch={() => setSearchInput("")}
        />

        <div className="flex items-center gap-2">
          <CustomSelect
            name="orderStatus"
            control={bulkStatusForm.control}
            options={statusOptions}
            fieldToValue={(value) => value ?? ""}
            valueToField={(value) => value}
            onChangeCallback={(value) => setBulkOrderStatus(value)}
            placeholder="Bulk status"
            triggerClassName="w-44 bg-white"
          />
          <CustomButton
            disabled={selectedIds.length === 0 || !bulkOrderStatus}
            onClick={applyBulkUpdate}
            loading={bulkPatchMutation.isPending}
          >
            Update Status
          </CustomButton>
          <CustomButton onClick={goCreate}>Add Stock</CustomButton>
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : error ? (
        <p className="text-red-500">Failed to load stocks</p>
      ) : (
        <Table<Stock>
          columns={columns}
          data={items}
          rowKey="id"
          pageSize={limit}
          serverSide
          currentPage={page}
          totalItems={data?.meta.total ?? 0}
          onPageChange={setPage}
          showIndex={false}
        />
      )}

      <DeleteModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title="Delete Stock"
        description={deleteTarget ? `Are you sure you want to delete invoice ${deleteTarget.invoiceNumber}?` : undefined}
        onConfirm={confirmDelete}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

function InlineStatusSelect({
  value,
  onChange
}: {
  value: StockOrderStatus;
  onChange: (value: StockOrderStatus) => void;
}) {
  const { control, reset } = useForm<{ status: StockOrderStatus }>({
    defaultValues: {
      status: value
    }
  });

  const timerRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    reset({ status: value });
  }, [value, reset]);

  React.useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleChange = (nextValue: string) => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }

    timerRef.current = window.setTimeout(() => {
      onChange(nextValue as StockOrderStatus);
      timerRef.current = null;
    }, 500);
  };

  return (
    <CustomSelect
      name="status"
      control={control}
      options={statusOptions.map((option) => ({
        ...option,
        label: formatOrderStatus(option.value as StockOrderStatus)
      }))}
      fieldToValue={(nextValue: StockOrderStatus) => nextValue}
      valueToField={(nextValue: string) => nextValue}
      onChangeCallback={handleChange}
      placeholder="Select status"
      triggerClassName="w-40 bg-white"
    />
  );
}
