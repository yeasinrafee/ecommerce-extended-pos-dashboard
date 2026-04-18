"use client"

import React from "react"
import Table, { type Column } from "@/components/Common/Table"
import TableSkeleton from "@/components/Common/TableSkeleton";
import CustomButton from "@/components/Common/CustomButton"
import CreateAttribute from "./CreateAttribute"
import DeleteModal from "@/components/Common/DeleteModal"
import SearchBar from "@/components/FormFields/SearchBar"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { MoreHorizontal } from "lucide-react"
import * as api from "@/hooks/attribute.api"
import type { Attribute } from "@/hooks/attribute.api"

export default function ManageAttributes() {
  const [modalOpen, setModalOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Attribute | null>(null)
  const [page, setPage] = React.useState(1)
  const limit = 10

  // search state
  const [searchInput, setSearchInput] = React.useState("")
  const [searchTerm, setSearchTerm] = React.useState<string | undefined>(undefined)

  React.useEffect(() => {
    const handle = setTimeout(() => {
      setPage(1)
      setSearchTerm(searchInput.trim() || undefined)
    }, 500)
    return () => clearTimeout(handle)
  }, [searchInput])

  const attrsQuery = api.usePaginatedAttributes(page, limit, searchTerm)
  const { data, isLoading, error } = attrsQuery
  const createMutation = api.useCreateAttribute()
  const updateMutation = api.useUpdateAttribute()
  const deleteMutation = api.useDeleteAttribute()

  const handleCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const handleEdit = (attr: Attribute) => {
    setEditing(attr)
    setModalOpen(true)
  }

  const [deleteTarget, setDeleteTarget] = React.useState<Attribute | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false)

  const handleDelete = (attr: Attribute) => {
    setDeleteTarget(attr)
    setDeleteModalOpen(true)
  }

  const handleSave = async (payload: { name: string; values?: string[] }) => {
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, payload })
      setEditing((prev) => (prev ? { ...prev, name: payload.name, values: payload.values ?? [] } : prev))
    } else {
      await createMutation.mutateAsync(payload)
    }

    setModalOpen(false)
  }

  const columns = React.useMemo<Column<Attribute>[]>(
    () => [
      {
        header: "Name",
        accessor: "name",
      },
      {
        header: "Values",
        cell: (row) => (row.values && row.values.length > 0 ? row.values.join(', ') : '-'),
        align: "left",
      },
      {
        header: "Created",
        accessor: "createdAt",
        cell: (row) => new Date(row.createdAt).toLocaleString()
      }
    ],
    [],
  )

  return (
    <div>
      <h2 className="mb-4 text-lg font-medium">Manage Attributes</h2>

      <div className="flex items-center justify-between mb-4">
        <SearchBar
          searchInput={searchInput}
          setSearchInput={setSearchInput}
          clearSearch={() => setSearchInput("")}
        />
        <CustomButton onClick={handleCreate}>Create Attribute</CustomButton>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : error ? (
        <p className="text-red-500">Failed to load attributes</p>
      ) : (
        <Table<Attribute>
          columns={columns}
          data={data?.data ?? []}
          rowKey="id"
          pageSize={limit}
          serverSide
          currentPage={page}
          totalItems={data?.meta.total ?? 0}
          onPageChange={setPage}
          renderRowActions={(attr) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleEdit(attr)}>
                  Edit
                </DropdownMenuItem>
                {/* <DropdownMenuItem
                  variant="destructive"
                  onClick={() => handleDelete(attr)}
                >
                  Delete
                </DropdownMenuItem> */}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        />
      )}

      <CreateAttribute
        open={modalOpen}
        onOpenChange={setModalOpen}
        defaultValues={editing ? { name: editing.name, values: editing.values } : undefined}
        submitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={handleSave}
      />

      <DeleteModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title="Confirm deletion"
        description={deleteTarget ? `Are you sure you want to delete attribute "${deleteTarget.name}"? This action cannot be undone.` : undefined}
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteModalOpen(false) });
          }
        }}
      />
    </div>
  )
}
