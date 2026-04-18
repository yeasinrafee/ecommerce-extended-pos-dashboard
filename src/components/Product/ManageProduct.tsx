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
import { MoreHorizontal } from "lucide-react";
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

  React.useEffect(() => {
    const handle = setTimeout(() => {
      setPage(1);
      setSearchTerm(searchInput.trim() || undefined);
    }, 500);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const { data: paged, isLoading, isError } = usePaginatedProducts(page, limit, searchTerm);
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

  const columns = React.useMemo<Column<any>[]>(
    () => [
      {
        header: (
          <div className="flex items-center justify-center gap-2">
            <input
              type="checkbox"
              checked={products.length > 0 && products.every((p: any) => selected[p.id])}
              onChange={(e) => {
                if (e.target.checked) selectAllOnPage();
                else clearSelection();
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
        header: "Image",
        cell: (row) =>
          row.image ? (
            <Image src={row.image} alt="" width={60} height={60} className="object-cover size-15" />
          ) : null,
      },
      { header: "Name", accessor: "name" },
      { header: "Brand", cell: (row) => row.brand?.name || "-" },
      {
        header: "Categories",
        cell: (row) => {
          if (!row.categories || !row.categories.length) return "-";
          return (
            <div className="truncate w-32">
              {row.categories
                .map((c: any) => c.category?.name || "")
                .filter((n: string) => !!n)
                .join(" - ")}
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
          />
        ),
      },
      { header: "Price", cell: (row) => (row.finalPrice != null ? `$${row.finalPrice}` : "-") },
      { header: "Stock", accessor: "stock" },
      // { header: "Created", accessor: "createdAt", cell: (row) => new Date(row.createdAt).toLocaleString() }
    ],
    [products, selected]
  );

  return (
    <div>
      <h2 className="mb-4 text-lg font-medium">Manage Products</h2>

      <div className="flex items-center justify-between mb-4">
        <SearchBar searchInput={searchInput} setSearchInput={setSearchInput} clearSearch={() => setSearchInput("")} />
        <div className="flex items-center gap-2">
          <CustomSelect
            name="status"
            control={bulkStatusForm.control}
            options={productStatusOptions}
            valueToField={(v) => v}
            fieldToValue={(v) => v}
            onChangeCallback={(v: string) => setBulkStatus(v)}
            placeholder="Status"
            triggerClassName="w-40 min-h-10 bg-background"
          />
          <CustomSelect
            name="stockStatus"
            control={bulkStatusForm.control}
            options={stockStatusOptions}
            valueToField={(v) => v}
            fieldToValue={(v) => v}
            onChangeCallback={(v: string) => setBulkStockStatus(v)}
            placeholder="Stock Status"
            triggerClassName="w-44 min-h-10 bg-background"
          />
          <CustomButton
            disabled={selectedIds.length === 0 || (!bulkStatus && !bulkStockStatus)}
            onClick={applyBulkUpdate}
            loading={bulkPatchMutation.isPending}
          >
            Update Status
          </CustomButton>
        </div>
      </div>

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
              <Button variant="ghost" size="icon"><MoreHorizontal /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleEdit(item)}>Edit</DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={() => handleDelete(item)}>Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      />

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