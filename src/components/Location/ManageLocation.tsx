"use client";

import React from "react";
import { useForm } from "react-hook-form";
import Table, { type Column } from "@/components/Common/Table";
import TableSkeleton from "@/components/Common/TableSkeleton";
import CustomButton from "@/components/Common/CustomButton";
import DeleteModal from "@/components/Common/DeleteModal";
import SearchBar from "@/components/FormFields/SearchBar";
import CustomSelect from "@/components/FormFields/CustomSelect";
import CreateLocation from "./CreateLocation";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import type { Location, LocationType, Status } from "@/hooks/location.api";
import { usePaginatedLocations, useDeleteLocation, useUpdateLocation } from "@/hooks/location.api";

export default function ManageLocation() {
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Location | null>(null);
  const [page, setPage] = React.useState(1);
  const limit = 10;

  const [searchInput, setSearchInput] = React.useState("");
  const [searchTerm, setSearchTerm] = React.useState<string | undefined>(undefined);
  const [selectedType, setSelectedType] = React.useState<LocationType | undefined>(undefined);
  const [selectedStatus, setSelectedStatus] = React.useState<Status | undefined>(undefined);

  React.useEffect(() => {
    const handle = window.setTimeout(() => {
      setPage(1);
      setSearchTerm(searchInput.trim() || undefined);
    }, 500);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  const { data, isLoading, error } = usePaginatedLocations(
    page,
    limit,
    searchTerm,
    selectedType,
    selectedStatus
  );

  const updateMutation = useUpdateLocation();
  const deleteMutation = useDeleteLocation();

  const items = data?.data ?? [];

  const [deleteTarget, setDeleteTarget] = React.useState<Location | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);

  const filterForm = useForm<{ type: string; status: string }>({
    defaultValues: { type: "ALL", status: "ALL" }
  });

  const handleCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const handleEdit = (location: Location) => {
    setEditing(location);
    setModalOpen(true);
  };

  const handleDelete = (location: Location) => {
    setDeleteTarget(location);
    setDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;

    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteModalOpen(false);
        setDeleteTarget(null);
      }
    });
  };

  const handleInlineStatusChange = (id: string, status: Status) => {
    updateMutation.mutate({ id, payload: { status } });
  };

  const columns = React.useMemo<Column<Location>[]>(
    () => [
      {
        header: "Name",
        cell: (row) => (
          <div className="flex flex-col text-left">
            <span className="font-medium text-sm text-gray-950">{row.name}</span>
          </div>
        ),
      },
      {
        header: "Code",
        cell: (row) => (
          <div className="text-left font-mono text-xs uppercase bg-gray-50 text-gray-700 px-2 py-1 rounded w-fit border border-gray-200">
            {row.code}
          </div>
        ),
      },
      {
        header: "Type",
        cell: (row) => (
          <div className="text-left">
            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
              row.type === "WAREHOUSE"
                ? "bg-purple-50 text-purple-700 ring-purple-700/10"
                : "bg-blue-50 text-blue-700 ring-blue-700/10"
            }`}>
              {row.type}
            </span>
          </div>
        ),
      },
      {
        header: "Phone",
        cell: (row) => <span className="text-gray-600">{row.phone || "—"}</span>,
      },
      {
        header: "Address",
        cell: (row) => (
          <div className="max-w-[200px] truncate text-gray-500" title={row.address || undefined}>
            {row.address || "—"}
          </div>
        ),
      },
      {
        header: "Status",
        cell: (row) => (
          <InlineStatusSelect
            value={row.status}
            onChange={(status) => handleInlineStatusChange(row.id, status)}
          />
        ),
        align: "center",
        className: "w-40",
      },
    ],
    []
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Manage Locations</h2>
          <p className="text-sm text-gray-500 mt-1">Manage and track stores and warehouses</p>
        </div>
        <CustomButton onClick={handleCreate}>Create Location</CustomButton>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <SearchBar searchInput={searchInput} setSearchInput={setSearchInput} clearSearch={() => setSearchInput("")} />

        <div className="flex items-center gap-3 w-full md:w-auto">
          <CustomSelect
            name="type"
            control={filterForm.control}
            options={[
              { label: "All Types", value: "ALL" },
              { label: "Store", value: "STORE" },
              { label: "Warehouse", value: "WAREHOUSE" },
            ]}
            valueToField={(value) => value}
            fieldToValue={(value) => value}
            onChangeCallback={(value: string) => {
              setPage(1);
              setSelectedType(value && value !== "ALL" ? (value as LocationType) : undefined);
            }}
            placeholder="Filter Type"
            triggerClassName="w-40 min-h-10 bg-background"
          />

          <CustomSelect
            name="status"
            control={filterForm.control}
            options={[
              { label: "All Statuses", value: "ALL" },
              { label: "Active", value: "ACTIVE" },
              { label: "Inactive", value: "INACTIVE" },
            ]}
            valueToField={(value) => value}
            fieldToValue={(value) => value}
            onChangeCallback={(value: string) => {
              setPage(1);
              setSelectedStatus(value && value !== "ALL" ? (value as Status) : undefined);
            }}
            placeholder="Filter Status"
            triggerClassName="w-40 min-h-10 bg-background"
          />
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : error ? (
        <p className="text-red-500 py-4 text-center">Failed to load locations.</p>
      ) : (
        <Table<Location>
          columns={columns}
          data={items}
          rowKey="id"
          pageSize={limit}
          serverSide
          currentPage={page}
          totalItems={data?.meta.total ?? 0}
          onPageChange={setPage}
          renderRowActions={(location) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleEdit(location)}>Edit</DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={() => handleDelete(location)}>
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        />
      )}

      {modalOpen && (
        <CreateLocation
          open={modalOpen}
          onOpenChange={setModalOpen}
          defaultValues={editing || undefined}
        />
      )}

      <DeleteModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title="Confirm Deletion"
        description={
          deleteTarget
            ? `Are you sure you want to delete location "${deleteTarget.name}"? This action cannot be undone.`
            : undefined
        }
        loading={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function InlineStatusSelect({ value, onChange }: { value: Status; onChange: (value: Status) => void }) {
  const { control, reset } = useForm<{ status: Status }>({ defaultValues: { status: value } });
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
    const nextStatus = nextValue as Status;
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
      options={[
        { label: "Active", value: "ACTIVE" },
        { label: "Inactive", value: "INACTIVE" },
      ]}
      fieldToValue={(nextValue: any) => nextValue ?? ""}
      valueToField={(nextValue: string) => nextValue}
      onChangeCallback={handleChange}
      placeholder="Status"
      triggerClassName="w-32 h-9"
    />
  );
}
