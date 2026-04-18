"use client"

import React from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import Table, { type Column } from "@/components/Common/Table";
import TableSkeleton from "@/components/Common/TableSkeleton";
import CustomButton from "@/components/Common/CustomButton";
import DeleteModal from "@/components/Common/DeleteModal";
import SearchBar from "@/components/FormFields/SearchBar";
import CreateSupplier from "./CreateSupplier";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import CustomSelect from "@/components/FormFields/CustomSelect";
import { initialsPlaceholder } from "@/utils/image-placeholder";
import type { Supplier, SupplierStatus } from "@/hooks/supplier.api";
import { useBulkUpdateSupplierStatus, useDeleteSupplier, usePaginatedSuppliers, useUpdateSupplier } from "@/hooks/supplier.api";

export default function ManageSupplier() {
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Supplier | null>(null);
  const [page, setPage] = React.useState(1);
  const limit = 10;

  const [searchInput, setSearchInput] = React.useState("");
  const [searchTerm, setSearchTerm] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    const handle = window.setTimeout(() => {
      setPage(1);
      setSearchTerm(searchInput.trim() || undefined);
    }, 500);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  const { data, isLoading, error } = usePaginatedSuppliers(page, limit, searchTerm);
  const updateMutation = useUpdateSupplier();
  const deleteMutation = useDeleteSupplier();
  const bulkUpdateMutation = useBulkUpdateSupplierStatus();

  const items = data?.data ?? [];

  const [selected, setSelected] = React.useState<Record<string, boolean>>({});
  const [optimisticStatus, setOptimisticStatus] = React.useState<Record<string, SupplierStatus>>({});
  const selectedIds = React.useMemo(() => Object.keys(selected).filter((key) => selected[key]), [selected]);

  const [deleteTarget, setDeleteTarget] = React.useState<Supplier | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);

  const toggleSelect = (id: number) => {
    const key = String(id);
    setSelected((current) => ({ ...current, [key]: !current[key] }));
  };

  const selectAllOnPage = () => {
    const next = { ...selected };
    items.forEach((item) => {
      next[String(item.id)] = true;
    });
    setSelected(next);
  };

  const clearSelection = () => setSelected({});

  const handleCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const handleEdit = (supplier: Supplier) => {
    setEditing(supplier);
    setModalOpen(true);
  };

  const handleDelete = (supplier: Supplier) => {
    setDeleteTarget(supplier);
    setDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;

    deleteMutation.mutate(id, {
      onSuccess: () => {
        setDeleteModalOpen(false);
        setDeleteTarget(null);
        setSelected((current) => {
          const copy = { ...current };
          delete copy[String(id)];
          return copy;
        });
      }
    });
  };

  const handleInlineStatusChange = (id: number, status: SupplierStatus) => {
    const previous = items.find((item) => item.id === id)?.status;
    setOptimisticStatus((current) => ({ ...current, [String(id)]: status }));

    updateMutation.mutate({ id, payload: { status } }, {
      onError: () => {
        setOptimisticStatus((current) => {
          const copy = { ...current };
          if (previous === undefined) {
            delete copy[String(id)];
          } else {
            copy[String(id)] = previous;
          }
          return copy;
        });
      },
      onSuccess: () => {
        setOptimisticStatus((current) => {
          const copy = { ...current };
          delete copy[String(id)];
          return copy;
        });
      }
    });
  };

  const [bulkStatus, setBulkStatus] = React.useState<SupplierStatus>("ACTIVE");
  const bulkForm = useForm<{ status: SupplierStatus }>({ defaultValues: { status: bulkStatus } });

  React.useEffect(() => {
    bulkForm.reset({ status: bulkStatus });
  }, [bulkStatus, bulkForm]);

  const applyBulkStatus = () => {
    if (selectedIds.length === 0) return;

    bulkUpdateMutation.mutate({ ids: selectedIds, status: bulkStatus }, {
      onSuccess: () => clearSelection()
    });
  };

  const columns = React.useMemo<Column<Supplier>[]>(
    () => [
      {
        header: (
          <div className="flex items-center justify-center gap-2">
            <input
              type="checkbox"
              checked={items.length > 0 && items.every((item) => selected[String(item.id)])}
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
            checked={!!selected[String(row.id)]}
            onChange={() => toggleSelect(row.id)}
          />
        ),
        className: "w-12 text-center"
      },
      {
        header: "Supplier",
        cell: (row) => {
          const image = row.image ?? null;
          const { initials, backgroundColor } = initialsPlaceholder(row.name ?? row.companyName ?? "");

          return (
            <div className="flex items-center gap-3">
              {image ? (
                <Image src={image} alt={row.name} width={32} height={32} className="h-8 w-8 rounded-sm object-cover" />
              ) : (
                <div className="h-8 w-8 rounded-sm flex items-center justify-center text-sm font-medium text-black" style={{ backgroundColor }}>
                  {initials}
                </div>
              )}

              <div className="flex flex-col text-left">
                <span className="font-medium text-sm">{row.name}</span>
                <span className="text-xs text-muted-foreground">{row.companyName ?? "No company"}</span>
              </div>
            </div>
          );
        },
      },
      {
        header: "Contact",
        cell: (row) => (
          <div className="flex flex-col text-left">
            <span>{row.email ?? "No email"}</span>
            <span className="text-xs text-muted-foreground">{row.phone ?? "No phone"}</span>
          </div>
        ),
      },
      {
        header: "Status",
        cell: (row) => (
          <InlineStatusSelect value={optimisticStatus[String(row.id)] ?? row.status} onChange={(status) => handleInlineStatusChange(row.id, status)} />
        ),
        align: "center",
        className: "w-48"
      },
      {
        header: "Created",
        accessor: "createdAt",
        cell: (row) => new Date(row.createdAt).toLocaleString()
      }
    ],
    [items, optimisticStatus, selected]
  );

  return (
    <div>
      <h2 className="mb-4 text-lg font-medium">Manage Suppliers</h2>

      <div className="flex items-center justify-between mb-4 gap-3">
        <SearchBar searchInput={searchInput} setSearchInput={setSearchInput} clearSearch={() => setSearchInput("")} />

        <div className="flex items-center gap-2">
          <CustomSelect
            name="status"
            control={bulkForm.control}
            options={[{ label: "Active", value: "ACTIVE" }, { label: "Inactive", value: "INACTIVE" }]}
            valueToField={(value) => value}
            fieldToValue={(value) => value}
            onChangeCallback={(value: string) => setBulkStatus(value as SupplierStatus)}
            placeholder="Bulk status"
            triggerClassName="w-40 min-h-10 bg-background"
          />
          <CustomButton disabled={selectedIds.length === 0} onClick={applyBulkStatus} loading={bulkUpdateMutation.isPending}>
            Update Status
          </CustomButton>
          <CustomButton onClick={handleCreate}>Create Supplier</CustomButton>
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : error ? (
        <p className="text-red-500">Failed to load suppliers</p>
      ) : (
        <Table<Supplier>
          columns={columns}
          data={items}
          rowKey="id"
          pageSize={limit}
          serverSide
          currentPage={page}
          totalItems={data?.meta.total ?? 0}
          onPageChange={setPage}
          renderRowActions={(supplier) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleEdit(supplier)}>Edit</DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={() => handleDelete(supplier)}>Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        />
      )}

      <CreateSupplier
        open={modalOpen}
        onOpenChange={setModalOpen}
        defaultValues={editing ? {
          id: editing.id,
          name: editing.name,
          email: editing.email ?? "",
          phone: editing.phone ?? "",
          companyName: editing.companyName ?? "",
          address: editing.address ?? "",
          image: editing.image
        } : undefined}
      />

      <DeleteModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title="Confirm deletion"
        description={deleteTarget ? `Are you sure you want to delete supplier "${deleteTarget.name}"? This action cannot be undone.` : undefined}
        loading={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function InlineStatusSelect({ value, onChange }: { value: SupplierStatus; onChange: (value: SupplierStatus) => void }) {
  const { control, reset } = useForm<{ status: SupplierStatus }>({ defaultValues: { status: value } });
  const timerRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    reset({ status: value });
  }, [value, reset]);

  React.useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const handleChange = (nextValue: string) => {
    const nextStatus = nextValue as SupplierStatus;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      onChange(nextStatus);
      timerRef.current = null;
    }, 500);
  };

  return (
    <CustomSelect
      name="status"
      control={control}
      options={[{ label: "Active", value: "ACTIVE" }, { label: "Inactive", value: "INACTIVE" }]}
      fieldToValue={(nextValue: any) => nextValue ?? ""}
      valueToField={(nextValue: string) => nextValue}
      onChangeCallback={handleChange}
      placeholder="Status"
      triggerClassName="w-32"
    />
  );
}