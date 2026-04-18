"use client"

import React from "react";
import Image from "next/image";
import Table, { type Column } from "@/components/Common/Table";
import TableSkeleton from "@/components/Common/TableSkeleton";
import CustomButton from "@/components/Common/CustomButton";
import SearchBar from "@/components/FormFields/SearchBar";
import { useForm } from "react-hook-form";
import { useCustomers, useUpdateCustomerStatus, useBulkUpdateCustomerStatus } from "@/hooks/customer.api";
import type { Customer } from "@/hooks/customer.api";
import CustomSelect from "@/components/FormFields/CustomSelect";
import { initialsPlaceholder } from "@/utils/image-placeholder";

export default function ManageCustomer() {
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

  const { data, isLoading, error } = useCustomers({ page, limit, searchTerm });
  const updateStatusMutation = useUpdateCustomerStatus();
  const bulkUpdateMutation = useBulkUpdateCustomerStatus();

  const items = data?.data ?? [];

  const [optimisticStatus, setOptimisticStatus] = React.useState<Record<string, string>>({});
  const [selected, setSelected] = React.useState<Record<string, boolean>>({});
  const selectedIds = React.useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);

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

  const handleInlineStatusChange = (id: string, status: "ACTIVE" | "INACTIVE") => {
    const prev = items.find((it) => it.id === id)?.status;
    setOptimisticStatus((s) => ({ ...s, [id]: status }));

    updateStatusMutation.mutate({ id, status }, {
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
      }
    });
  };

  const [bulkStatus, setBulkStatus] = React.useState<string>("ACTIVE");
  const bulkForm = useForm<{ status: string }>({ defaultValues: { status: bulkStatus } });

  React.useEffect(() => {
    bulkForm.reset({ status: bulkStatus });
  }, [bulkStatus]);

  const applyBulkStatus = () => {
    if (selectedIds.length === 0) return;
    const prev: Record<string, string | undefined> = {};
    selectedIds.forEach((id) => {
      prev[id] = optimisticStatus[id] ?? items.find((it) => it.id === id)?.status;
    });

    setOptimisticStatus((s) => {
      const copy = { ...s };
      selectedIds.forEach((id) => (copy[id] = bulkStatus));
      return copy;
    });

    bulkUpdateMutation.mutate({ ids: selectedIds, status: bulkStatus }, {
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
      }
    });
  };

  const columns = React.useMemo<Column<Customer>[]>(
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
        header: "Customer",
        cell: (row) => {
          const image = row.image ?? null;
          const { initials, backgroundColor } = initialsPlaceholder(row.user?.email ?? "C");

          return (
            <div className="flex items-center gap-3">
              {image ? (
                <Image src={image} alt={row.user?.email} width={32} height={32} className="h-8 w-8 rounded-sm object-cover" />
              ) : (
                <div
                  className="h-8 w-8 rounded-sm flex items-center justify-center text-sm font-medium text-black"
                  style={{ backgroundColor }}
                >
                  {initials}
                </div>
              )}

              <div className="flex flex-col text-left">
                <span className="font-medium text-sm">{row.user?.email}</span>
                <span className="text-xs text-muted-foreground">{row.phone ?? "No phone"}</span>
              </div>
            </div>
          );
        },
      },
      {
        header: "Email Verified",
        cell: (row) => (
          <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${row.user?.verified ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
            {row.user?.verified ? "VERIFIED" : "UNVERIFIED"}
          </span>
        ),
        align: "center"
      },
      {
        header: "Status",
        cell: (row) => (
          <InlineStatusSelect value={optimisticStatus[row.id] ?? row.status} onChange={(s) => handleInlineStatusChange(row.id, s as "ACTIVE" | "INACTIVE")} />
        ),
        align: "center",
        className: "w-48"
      },
      {
        header: "Joined",
        accessor: "createdAt",
        cell: (row) => new Date(row.createdAt).toLocaleDateString()
      }
    ],
    [items, selected]
  );

  return (
    <div>
      <h2 className="mb-4 text-lg font-medium">Manage Customers</h2>

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
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : error ? (
        <p className="text-red-500">Failed to load customers</p>
      ) : (
        <Table<Customer>
          columns={columns}
          data={items}
          rowKey="id"
          pageSize={limit}
          serverSide
          currentPage={page}
          totalItems={Number(data?.meta?.total ?? 0)}
          onPageChange={setPage}
        />
      )}
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