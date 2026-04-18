"use client"

import React from "react";
import Image from "next/image";
import Table, { type Column } from "@/components/Common/Table";
import TableSkeleton from "@/components/Common/TableSkeleton";
import CustomButton from "@/components/Common/CustomButton";
import CreateAdmin from "./CreateAdmin";
import DeleteModal from "@/components/Common/DeleteModal";
import SearchBar from "@/components/FormFields/SearchBar";
import { useForm } from "react-hook-form";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import { usePaginatedAdmins, useUpdateAdmin, useDeleteAdmin, useBulkUpdateAdminStatus } from "@/hooks/admin.api";
import type { Admin } from "@/hooks/admin.api";
import CustomSelect from "@/components/FormFields/CustomSelect";
import { initialsPlaceholder } from "@/utils/image-placeholder";

export default function ManageAdmin() {
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Admin | null>(null);
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

  const { data, isLoading, error } = usePaginatedAdmins(page, limit, searchTerm);
  const updateMutation = useUpdateAdmin();
  const deleteMutation = useDeleteAdmin();
  const bulkUpdateMutation = useBulkUpdateAdminStatus();

  const items = data?.data ?? [];

  const [selected, setSelected] = React.useState<Record<string, boolean>>({});
  const selectedIds = React.useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);

  const [deleteTarget, setDeleteTarget] = React.useState<Admin | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);

  const toggleSelect = (id: string) => {
    setSelected((s) => ({ ...s, [id]: !s[id] }));
  };

  const selectAllOnPage = () => {
    const newSel: Record<string, boolean> = { ...selected };
    items.forEach((it) => {
      newSel[it.id] = true;
    });
    setSelected(newSel);
  };

  const clearSelection = () => setSelected({});

  const handleEdit = (admin: Admin) => {
    setEditing(admin);
    setModalOpen(true);
  };

  const handleDelete = (admin: Admin) => {
    setDeleteTarget(admin);
    setDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    deleteMutation.mutate(id, {
      onSuccess: () => {
        setDeleteModalOpen(false);
        setDeleteTarget(null);
        setSelected((prev) => {
          const copy = { ...prev };
          delete copy[id];
          return copy;
        });
      }
    });
  };

  const handleInlineStatusChange = (id: string, status: "ACTIVE" | "INACTIVE") => {
    updateMutation.mutate({ id, payload: { status } });
  };

  const [bulkStatus, setBulkStatus] = React.useState<string>("ACTIVE");
  const bulkForm = useForm<{ status: string }>({ defaultValues: { status: bulkStatus } });

  React.useEffect(() => {
    bulkForm.reset({ status: bulkStatus });
  }, [bulkStatus]);

  const applyBulkStatus = () => {
    if (selectedIds.length === 0) return;
    bulkUpdateMutation.mutate({ ids: selectedIds, status: bulkStatus }, {
      onSuccess: () => clearSelection()
    });
  };

  const columns = React.useMemo<Column<Admin>[]>(
    () => [
      {
        header: (
          <div className="flex items-center justify-center gap-2">
            <input
              type="checkbox"
              checked={items.length > 0 && items.every((it) => selected[it.id])}
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
        header: "Name",
        cell: (row) => {
          const image = row.image ?? null;
          const { initials, backgroundColor } = initialsPlaceholder(row.name ?? row.user?.email ?? "");

          return (
            <div className="flex items-center gap-3">
              {image ? (
                <Image src={image} alt={row.name} width={32} height={32} className="h-8 w-8 rounded-sm object-cover" />
              ) : (
                <div
                  className="h-8 w-8 rounded-sm flex items-center justify-center text-sm font-medium text-black"
                  style={{ backgroundColor }}
                >
                  {initials}
                </div>
              )}

              <div className="flex flex-col">
                <span className="font-medium">{row.name}</span>
              </div>
            </div>
          );
        },
      },
      {
        header: "Email",
        cell: (row) => row.user?.email ?? "-",
      },
      {
        header: "Status",
        cell: (row) => (
          <InlineStatusSelect value={row.status} onChange={(s) => handleInlineStatusChange(row.id, s as "ACTIVE" | "INACTIVE")} />
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
    [items, selected]
  );

  return (
    <div>
      <h2 className="mb-4 text-lg font-medium">Manage Admins</h2>

      <div className="flex items-center justify-between mb-4">
        <SearchBar
          searchInput={searchInput}
          setSearchInput={setSearchInput}
          clearSearch={() => setSearchInput("")}
        />

        <div className="flex items-center gap-2">
          <CustomSelect
            name="status"
            control={bulkForm.control}
            options={[{ label: "Active", value: "ACTIVE" }, { label: "Inactive", value: "INACTIVE" }]}
            valueToField={(v) => v}
            fieldToValue={(v) => v}
            onChangeCallback={(v: string) => setBulkStatus(v)}
            placeholder="Bulk status"
            triggerClassName="w-40 min-h-10 bg-background"
          />
          <CustomButton disabled={selectedIds.length === 0} onClick={applyBulkStatus} loading={bulkUpdateMutation.isPending}>Update Status</CustomButton>
          <CustomButton onClick={() => { setEditing(null); setModalOpen(true); }}>Create Admin</CustomButton>
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : error ? (
        <p className="text-red-500">Failed to load admins</p>
      ) : (
        <Table<Admin>
          columns={columns}
          data={items}
          rowKey="id"
          pageSize={limit}
          serverSide
          currentPage={page}
          totalItems={data?.meta.total ?? 0}
          onPageChange={setPage}
          renderRowActions={(admin) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleEdit(admin)}>Edit</DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={() => handleDelete(admin)}>Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        />
      )}

      <CreateAdmin
        open={modalOpen}
        onOpenChange={setModalOpen}
        defaultValues={
          editing
            ? { id: editing.id, name: editing.name, email: editing.user?.email, image: editing.image }
            : undefined
        }
      />
      <DeleteModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title="Confirm deletion"
        description={deleteTarget ? `Are you sure you want to delete admin "${deleteTarget.name}"? This will permanently remove the admin.` : undefined}
        loading={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function InlineStatusSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { control, reset } = useForm<{ status: string }>({ defaultValues: { status: value } });
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
      options={[{ label: "Active", value: "ACTIVE" }, { label: "Inactive", value: "INACTIVE" }]}
      fieldToValue={(v: any) => v ?? ""}
      valueToField={(v: string) => v}
      onChangeCallback={handleChange}
      placeholder="Status"
      triggerClassName="w-32"
    />
  );
}