"use client"

import React from "react";
import { useForm } from "react-hook-form";
import Table, { type Column } from "@/components/Common/Table";
import TableSkeleton from "@/components/Common/TableSkeleton";
import CustomButton from "@/components/Common/CustomButton";
import DeleteModal from "@/components/Common/DeleteModal";
import SearchBar from "@/components/FormFields/SearchBar";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Edit2, Trash2 } from "lucide-react";
import { BiBarcodeReader } from "react-icons/bi";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { usePaginatedProducts, useDeleteProduct, usePatchProduct, useBulkPatchProducts } from "@/hooks/product.api";
import CustomSelect from "@/components/FormFields/CustomSelect";

const productStatusOptions = [
  { label: "Active", value: "ACTIVE" },
  { label: "Inactive", value: "INACTIVE" },
];

const stockStatusOptions = [
  { label: "In Stock", value: "IN_STOCK" },
  { label: "Low Stock", value: "LOW_STOCK" },
  { label: "Out of Stock", value: "OUT_OF_STOCK" },
];

const ManageProduct: React.FC = () => {
  const router = useRouter();
  const [page, setPage] = React.useState(1);
  const limit = 10;

  const [searchInput, setSearchInput] = React.useState("");
  const [searchTerm, setSearchTerm] = React.useState<string | undefined>(undefined);

  const [barcodeInput, setBarcodeInput] = React.useState("");
  const [barcodeId, setBarcodeId] = React.useState<string | undefined>(undefined);

  // Hydration guard state
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    const handle = setTimeout(() => {
      setPage(1);
      setSearchTerm(searchInput.trim() || undefined);
    }, 500);
    return () => clearTimeout(handle);
  }, [searchInput]);

  // Debounce barcode search — only pass digits to backend
  React.useEffect(() => {
    const digitsOnly = barcodeInput.replace(/\D/g, "");
    const handle = setTimeout(() => {
      setPage(1);
      setBarcodeId(digitsOnly || undefined);
    }, 500);
    return () => clearTimeout(handle);
  }, [barcodeInput]);

  const { data: paged, isLoading, isError } = usePaginatedProducts(page, limit, searchTerm, barcodeId);
  const patchMutation = usePatchProduct();
  const bulkPatchMutation = useBulkPatchProducts();

  const products = paged?.data ?? [];
  const total = paged?.meta?.total ?? 0;

  const [selected, setSelected] = React.useState<Record<string, boolean>>({});
  const selectedIds = React.useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);

  const [bulkStatus, setBulkStatus] = React.useState("");
  const [bulkStockStatus, setBulkStockStatus] = React.useState("");
  const bulkStatusForm = useForm<{ status: string; stockStatus: string }>({ defaultValues: { status: "", stockStatus: "" } });

  const toggleSelect = (id: string) => {
    setSelected((s) => ({ ...s, [id]: !s[id] }));
  };

  const selectAllOnPage = () => {
    const newSel: Record<string, boolean> = { ...selected };
    products.forEach((p: any) => { newSel[p.id] = true; });
    setSelected(newSel);
  };

  const clearSelection = () => setSelected({});

  const applyBulkUpdate = () => {
    if (selectedIds.length === 0) return;
    const payload: { ids: string[]; status?: string; stockStatus?: string } = { ids: selectedIds };
    if (bulkStatus) payload.status = bulkStatus;
    if (bulkStockStatus) payload.stockStatus = bulkStockStatus;
    bulkPatchMutation.mutate(payload, { onSuccess: () => clearSelection() });
  };

  const [deleteTarget, setDeleteTarget] = React.useState<any | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const deleteMutation = useDeleteProduct();

  const handleEdit = (item: any) => {
    router.push(`/dashboard/product/edit?id=${item.id}`);
  };

  const handleDelete = (item: any) => {
    setDeleteTarget(item);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      setDeleteModalOpen(false);
      setDeleteTarget(null);
    } catch {
    }
  };

  const handleInlineStatusChange = (id: string, status: string) => {
    patchMutation.mutate({ id, payload: { status } });
  };

  const handleInlineStockStatusChange = (id: string, stockStatus: string) => {
    patchMutation.mutate({ id, payload: { stockStatus } });
  };

  const getStatusClassName = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 focus:ring-emerald-500 font-medium";
      case "INACTIVE":
        return "bg-slate-100 text-slate-600 border-slate-200 focus:ring-slate-400";
      default:
        return "bg-background";
    }
  };

  const getStockClassName = (stockStatus: string) => {
    switch (stockStatus) {
      case "IN_STOCK":
        return "bg-blue-50 text-blue-700 border-blue-200 focus:ring-blue-500 font-medium";
      case "LOW_STOCK":
        return "bg-amber-50 text-amber-700 border-amber-200 focus:ring-amber-500 font-medium";
      case "OUT_OF_STOCK":
        return "bg-rose-50 text-rose-700 border-rose-200 focus:ring-rose-500 font-medium";
      default:
        return "bg-background";
    }
  };

  const columns = React.useMemo<Column<any>[]>(
    () => [
      {
        header: (
          <div className="flex items-center justify-center pl-2">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer accent-slate-800"
              checked={products.length > 0 && products.every((p: any) => selected[p.id])}
              onChange={(e) => {
                if (e.target.checked) selectAllOnPage();
                else clearSelection();
              }}
            />
          </div>
        ),
        cell: (row) => (
          <div className="flex items-center justify-center pl-2">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer accent-slate-800"
              checked={!!selected[row.id]}
              onChange={() => toggleSelect(row.id)}
            />
          </div>
        ),
        className: "w-12 text-center"
      },
      {
        header: "Image",
        cell: (row) =>
          row.image ? (
            <div className="relative size-12 rounded-lg overflow-hidden border border-slate-100 bg-slate-50">
              <Image src={row.image} alt={row.name || ""} fill className="object-cover" />
            </div>
          ) : (
            <div className="size-12 rounded-lg bg-slate-100 flex items-center justify-center text-xs text-slate-400">No Img</div>
          ),
      },
      { 
        header: "Name", 
        cell: (row) => <span className="font-medium text-slate-800 line-clamp-2 max-w-[200px]">{row.name}</span> 
      },
      { header: "Brand", cell: (row) => <span className="text-slate-600 font-medium">{row.brand?.name || "-"}</span> },
      {
        header: "Categories",
        cell: (row) => {
          if (!row.categories || !row.categories.length) return <span className="text-slate-400">-</span>;
          return (
            <div className="truncate w-32 text-slate-500 text-sm">
              {row.categories
                .map((c: any) => c.category?.name || "")
                .filter((n: string) => !!n)
                .join(" • ")}
            </div>
          );
        },
      },
      {
        header: "Status",
        cell: (row) => (
          <InlineSelect
            value={row.status || ""}
            options={productStatusOptions}
            placeholder="Status"
            onChange={(v) => handleInlineStatusChange(row.id, v)}
            triggerClassName={`w-32 h-9 text-xs rounded-full border transition-all ${getStatusClassName(row.status)}`}
          />
        ),
      },
      {
        header: "Stock Status",
        cell: (row) => (
          <InlineSelect
            value={row.stockStatus || ""}
            options={stockStatusOptions}
            placeholder="Stock Status"
            onChange={(v) => handleInlineStockStatusChange(row.id, v)}
            triggerClassName={`w-36 h-9 text-xs rounded-full border transition-all ${getStockClassName(row.stockStatus)}`}
          />
        ),
      },
      { 
        header: "Price", 
        cell: (row) => (row.finalPrice != null ? <span className="font-semibold text-slate-900">${row.finalPrice}</span> : <span className="text-slate-400">-</span>) 
      },
      { 
        header: "Stock", 
        cell: (row) => <span className="font-medium text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md text-xs">{row.stock ?? 0} pcs</span> 
      },
    ],
    [products, selected]
  );

  // Render skeletal loader on server side to prevent dynamic component ID mismatch
  if (!mounted) {
    return <TableSkeleton />;
  }

  return (
    <div className="p-6 bg-white rounded-xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-800 tracking-tight">Manage Products</h2>
        <p className="text-sm text-slate-500 mt-0.5">Update product details, inventories and tracking status.</p>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
        <SearchBar searchInput={searchInput} setSearchInput={setSearchInput} clearSearch={() => setSearchInput("")} />

        <div className="flex flex-wrap items-center gap-3">
          {/* Barcode search — accepts manual input or a physical barcode scanner */}
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              pattern="\d*"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value.replace(/\D/g, ""))}
              placeholder="Search by barcode…"
              className="h-10 w-48 rounded-lg border border-slate-200 bg-white px-3 pr-9 text-sm shadow-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-colors"
            />
            {barcodeInput ? (
              <button
                type="button"
                onClick={() => setBarcodeInput("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Clear barcode search"
              >
                ✕
              </button>
            ) : (
              <BiBarcodeReader
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                size={17}
                aria-hidden="true"
              />
            )}
          </div>

          {selectedIds.length > 0 && (
            <span className="text-xs font-medium text-slate-500 bg-slate-200/80 px-2.5 py-1.5 rounded-lg">
              {selectedIds.length} Selected
            </span>
          )}
          <CustomSelect
            name="status"
            control={bulkStatusForm.control}
            options={productStatusOptions}
            valueToField={(v) => v}
            fieldToValue={(v) => v}
            onChangeCallback={(v: string) => setBulkStatus(v)}
            placeholder="Bulk Status"
            triggerClassName="w-36 h-10 bg-white border-slate-200 rounded-lg text-sm"
          />
          <CustomSelect
            name="stockStatus"
            control={bulkStatusForm.control}
            options={stockStatusOptions}
            valueToField={(v) => v}
            fieldToValue={(v) => v}
            onChangeCallback={(v: string) => setBulkStockStatus(v)}
            placeholder="Bulk Stock"
            triggerClassName="w-40 h-10 bg-white border-slate-200 rounded-lg text-sm"
          />
          <CustomButton
            disabled={selectedIds.length === 0 || (!bulkStatus && !bulkStockStatus)}
            onClick={applyBulkUpdate}
            loading={bulkPatchMutation.isPending}
            className="h-10 rounded-lg font-medium px-4 transition-all"
          >
            Apply Action
          </CustomButton>
        </div>
      </div>

      <div className="overflow-x-auto border border-slate-200/80 rounded-lg overflow-hidden">
        <Table<any>
          columns={columns}
          data={products}
          rowKey="id"
          pageSize={limit}
          serverSide={true}
          currentPage={page}
          totalItems={total}
          onPageChange={setPage}
          renderRowActions={(item) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-slate-100 text-slate-500">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 rounded-lg border-slate-100">
                <DropdownMenuItem onClick={() => handleEdit(item)} className="flex items-center gap-2 text-slate-600 cursor-pointer">
                  <Edit2 className="size-3.5" /> Edit Product
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={() => handleDelete(item)} className="flex items-center gap-2 cursor-pointer text-rose-600 focus:text-rose-600 focus:bg-rose-50">
                  <Trash2 className="size-3.5" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        />
      </div>

      <DeleteModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title="Confirm deletion"
        description={deleteTarget ? `Are you sure you want to delete product "${deleteTarget.name}"? This action cannot be undone.` : undefined}
        loading={(deleteMutation as any).isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
};

export default ManageProduct;

interface InlineSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  placeholder?: string;
  triggerClassName?: string;
}

function InlineSelect({
  value,
  onChange,
  options,
  placeholder = "Select",
  triggerClassName,
}: InlineSelectProps) {
  const { control, reset } = useForm<{ value: string }>({ defaultValues: { value } });
  const timerRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    reset({ value });
  }, [value, reset]);

  React.useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const handleChange = (v: string) => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      onChange(v);
      timerRef.current = null;
    }, 500);
  };

  return (
    <CustomSelect
      name="value"
      control={control}
      options={options}
      fieldToValue={(val: any) => val ?? ""}
      valueToField={(val: string) => val}
      onChangeCallback={handleChange}
      placeholder={placeholder}
      triggerClassName={triggerClassName ?? "w-40"}
    />
  );
}