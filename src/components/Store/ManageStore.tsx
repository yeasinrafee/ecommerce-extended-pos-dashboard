"use client"

import React from "react";
import { useForm } from "react-hook-form";
import Table, { type Column } from "@/components/Common/Table";
import TableSkeleton from "@/components/Common/TableSkeleton";
import CustomButton from "@/components/Common/CustomButton";
import DeleteModal from "@/components/Common/DeleteModal";
import SearchBar from "@/components/FormFields/SearchBar";
import CreateStore from "./CreateStore";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import CustomSelect from "@/components/FormFields/CustomSelect";
import type { Store, StoreStatus } from "@/hooks/store.api";
import { useBulkUpdateStoreStatus, useDeleteStore, usePaginatedStores, useUpdateStore } from "@/hooks/store.api";

export default function ManageStore() {
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Store | null>(null);
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

  const { data, isLoading, error } = usePaginatedStores(page, limit, searchTerm);
  const updateMutation = useUpdateStore();
  const deleteMutation = useDeleteStore();
  const bulkUpdateMutation = useBulkUpdateStoreStatus();

  const items = data?.data ?? [];

  const [selected, setSelected] = React.useState<Record<string, boolean>>({});
  const [optimisticStatus, setOptimisticStatus] = React.useState<Record<string, StoreStatus>>({});
  const selectedIds = React.useMemo(() => Object.keys(selected).filter((key) => selected[key]), [selected]);

  const [deleteTarget, setDeleteTarget] = React.useState<Store | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);

  const toggleSelect = (id: string) => {
    setSelected((current) => ({ ...current, [id]: !current[id] }));
  };

  const selectAllOnPage = () => {
    const next = { ...selected };
    items.forEach((item) => {
      next[item.id] = true;
    });
    setSelected(next);
  };

  const clearSelection = () => setSelected({});

  const handleCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const handleEdit = (store: Store) => {
    setEditing(store);
    setModalOpen(true);
  };

  const handleDelete = (store: Store) => {
    setDeleteTarget(store);
    setDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;

    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteModalOpen(false);
        setDeleteTarget(null);
        setSelected((current) => {
          const copy = { ...current };
          delete copy[deleteTarget.id];
          return copy;
        });
      }
    });
  };

  const handleInlineStatusChange = (id: string, status: StoreStatus) => {
    const previous = items.find((item) => item.id === id)?.status;
    setOptimisticStatus((current) => ({ ...current, [id]: status }));

    updateMutation.mutate({ id, payload: { status } }, {
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
      },
      onSuccess: () => {
        setOptimisticStatus((current) => {
          const copy = { ...current };
          delete copy[id];
          return copy;
        });
      }
    });
  };

  const [bulkStatus, setBulkStatus] = React.useState<StoreStatus>("ACTIVE");
  const bulkForm = useForm<{ status: StoreStatus }>({ defaultValues: { status: bulkStatus } });

  React.useEffect(() => {
    bulkForm.reset({ status: bulkStatus });
  }, [bulkStatus, bulkForm]);

  const applyBulkStatus = () => {
    if (selectedIds.length === 0) return;

    bulkUpdateMutation.mutate({ ids: selectedIds, status: bulkStatus }, {
      onSuccess: () => clearSelection()
    });
  };

  const columns = React.useMemo<Column<Store>[]>(
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
        header: "Store",
        cell: (row) => (
          <div className="flex flex-col text-left">
            <span className="font-medium text-sm">{row.name}</span>
          </div>
        ),
      },
      {
        header: "Address",
        cell: (row) => (
          <div className="flex flex-col text-left">
            <span>{row.address}</span>
          </div>
        ),
      },
      {
        header: "Status",
        cell: (row) => (
          <InlineStatusSelect value={optimisticStatus[row.id] ?? row.status} onChange={(status) => handleInlineStatusChange(row.id, status)} />
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
      <h2 className="mb-4 text-lg font-medium">Manage Stores</h2>

      <div className="flex items-center justify-between mb-4 gap-3">
        <SearchBar searchInput={searchInput} setSearchInput={setSearchInput} clearSearch={() => setSearchInput("")} />

        <div className="flex items-center gap-2">
          <CustomSelect
            name="status"
            control={bulkForm.control}
            options={[{ label: "Active", value: "ACTIVE" }, { label: "Inactive", value: "INACTIVE" }]}
            valueToField={(value) => value}
            fieldToValue={(value) => value}
            onChangeCallback={(value: string) => setBulkStatus(value as StoreStatus)}
            placeholder="Bulk status"
            triggerClassName="w-40 min-h-10 bg-background"
          />
          <CustomButton disabled={selectedIds.length === 0} onClick={applyBulkStatus} loading={bulkUpdateMutation.isPending}>
            Update Status
          </CustomButton>
          <CustomButton onClick={handleCreate}>Create Store</CustomButton>
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : error ? (
        <p className="text-red-500">Failed to load stores</p>
      ) : (
        <Table<Store>
          columns={columns}
          data={items}
          rowKey="id"
          pageSize={limit}
          serverSide
          currentPage={page}
          totalItems={data?.meta.total ?? 0}
          onPageChange={setPage}
          renderRowActions={(store) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleEdit(store)}>Edit</DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={() => handleDelete(store)}>Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        />
      )}

      <CreateStore
        open={modalOpen}
        onOpenChange={setModalOpen}
        defaultValues={editing ? { id: editing.id, name: editing.name, address: editing.address } : undefined}
      />

      <DeleteModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title="Confirm deletion"
        description={deleteTarget ? `Are you sure you want to delete store "${deleteTarget.name}"? This action cannot be undone.` : undefined}
        loading={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function InlineStatusSelect({ value, onChange }: { value: StoreStatus; onChange: (value: StoreStatus) => void }) {
  const { control, reset } = useForm<{ status: StoreStatus }>({ defaultValues: { status: value } });
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
    const nextStatus = nextValue as StoreStatus;
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