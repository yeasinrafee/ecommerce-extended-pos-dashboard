"use client";

import React from "react";
import Table, { type Column } from "@/components/Common/Table";
import TableSkeleton from "@/components/Common/TableSkeleton";
import CustomButton from "@/components/Common/CustomButton";
import DeleteModal from "@/components/Common/DeleteModal";
import SearchBar from "@/components/FormFields/SearchBar";
import CreateBank from "./CreateBank";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Landmark } from "lucide-react";
import type { Bank } from "@/hooks/bank.api";
import { useAllBanks, useDeleteBank } from "@/hooks/bank.api";

export default function ManageBank() {
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Bank | null>(null);

  const [searchInput, setSearchInput] = React.useState("");
  const [searchTerm, setSearchTerm] = React.useState<string | undefined>(
    undefined,
  );

  React.useEffect(() => {
    const handle = window.setTimeout(() => {
      setSearchTerm(searchInput.trim() || undefined);
    }, 500);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  const { data, isLoading, error } = useAllBanks(searchTerm);
  const deleteMutation = useDeleteBank();

  const items = data ?? [];

  const [deleteTarget, setDeleteTarget] = React.useState<Bank | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);

  const handleCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const handleEdit = (bank: Bank) => {
    setEditing(bank);
    setModalOpen(true);
  };

  const handleDelete = (bank: Bank) => {
    setDeleteTarget(bank);
    setDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;

    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteModalOpen(false);
        setDeleteTarget(null);
      },
    });
  };

  const columns = React.useMemo<Column<Bank>[]>(
    () => [
      {
        header: "Bank Name",
        cell: (row) => (
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-sm bg-blue-50/50 flex items-center justify-center border border-blue-100">
              <Landmark className="size-4 text-blue-600" />
            </div>
            <span className="font-semibold text-sm">{row.bankName}</span>
          </div>
        ),
      },
      {
        header: "Branch",
        cell: (row) => (
          <div className="flex flex-col text-left">
            <span>{row.branch}</span>
          </div>
        ),
      },
      {
        header: "Account Number",
        cell: (row) => (
          <span className="font-mono text-sm tracking-wide">
            {row.accountNumber}
          </span>
        ),
      },
      {
        header: "Added On",
        accessor: "createdAt",
        cell: (row) =>
          new Date(row.createdAt).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
      },
    ],
    [],
  );

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold flex items-center gap-2">
        <Landmark className="size-5 text-brand-primary" />
        Manage Banks
      </h2>

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 gap-3">
        <div className="w-full md:max-w-xs lg:max-w-sm">
          <SearchBar
            searchInput={searchInput}
            setSearchInput={setSearchInput}
            clearSearch={() => setSearchInput("")}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <CustomButton onClick={handleCreate} size="md">
            + Add Bank Account
          </CustomButton>
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : error ? (
        <p className="text-red-500">Failed to load bank accounts</p>
      ) : (
        <Table<Bank>
          columns={columns}
          data={items}
          rowKey="id"
          pageSize={20}
          totalItems={items.length}
          renderRowActions={(bank) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleEdit(bank)}>
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => handleDelete(bank)}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        />
      )}

      <CreateBank
        open={modalOpen}
        onOpenChange={setModalOpen}
        defaultValues={
          editing
            ? {
                id: editing.id,
                bankName: editing.bankName,
                branch: editing.branch,
                accountNumber: editing.accountNumber,
              }
            : undefined
        }
      />

      <DeleteModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title="Confirm deletion"
        description={
          deleteTarget
            ? `Are you sure you want to delete bank account "${deleteTarget.bankName}"? This action cannot be undone.`
            : undefined
        }
        loading={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
