"use client"

import React from "react"
import Table, { type Column } from "@/components/Common/Table"
import TableSkeleton from "@/components/Common/TableSkeleton";
import CustomButton from "@/components/Common/CustomButton"
import CreateZone from "./CreateZone"
import DeleteModal from "@/components/Common/DeleteModal"
import SearchBar from "@/components/FormFields/SearchBar"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { MoreHorizontal } from "lucide-react"
import * as api from "@/hooks/zone.api"
import type { Zone } from "@/hooks/zone.api"

export default function ManageZone() {
  const [modalOpen, setModalOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Zone | null>(null)
  const [page, setPage] = React.useState(1)
  const limit = 10

  const [searchInput, setSearchInput] = React.useState("")
  const [searchTerm, setSearchTerm] = React.useState<string | undefined>(undefined)

  React.useEffect(() => {
    const handle = setTimeout(() => {
      setPage(1)
      setSearchTerm(searchInput.trim() || undefined)
    }, 500)
    return () => clearTimeout(handle)
  }, [searchInput])

  const zonesQuery = api.usePaginatedZones(page, limit, searchTerm)
  const { data, isLoading, error } = zonesQuery
  const createMutation = api.useCreateZone()
  const updateMutation = api.useUpdateZone()
  const deleteMutation = api.useDeleteZone()

  const handleCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const handleEdit = (zone: Zone) => {
    setEditing(zone)
    setModalOpen(true)
  }

  const [deleteTarget, setDeleteTarget] = React.useState<Zone | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false)

  const handleDelete = (zone: Zone) => {
    setDeleteTarget(zone)
    setDeleteModalOpen(true)
  }

  const handleSaveZone = async (payload: { name: string }) => {
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, payload })
    } else {
      await createMutation.mutateAsync(payload.name)
    }

    setModalOpen(false)
  }

  const columns = React.useMemo<Column<Zone>[]>(
    () => [
      { header: "Zone", accessor: "name" },
      { header: "Created", accessor: "createdAt", cell: (row) => new Date(row.createdAt).toLocaleString() }
    ],
    []
  )

  return (
    <div>
      <h2 className="mb-4 text-lg font-medium">Manage Zones</h2>

      <div className="flex items-center justify-between mb-4">
        <SearchBar searchInput={searchInput} setSearchInput={setSearchInput} clearSearch={() => setSearchInput("")} />
        <CustomButton onClick={handleCreate}>Create Zone</CustomButton>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : error ? (
        <p className="text-red-500">Failed to load zones</p>
      ) : (
        <Table<Zone>
          columns={columns}
          data={data?.data ?? []}
          rowKey="id"
          pageSize={limit}
          serverSide
          currentPage={page}
          totalItems={data?.meta.total ?? 0}
          onPageChange={setPage}
          renderRowActions={(zone) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleEdit(zone)}>Edit</DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={() => handleDelete(zone)}>Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        />
      )}

      <CreateZone
        open={modalOpen}
        onOpenChange={setModalOpen}
        defaultValues={editing ? { name: editing.name } : undefined}
        submitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={handleSaveZone}
      />

      <DeleteModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title="Confirm deletion"
        description={deleteTarget ? `Are you sure you want to delete zone "${deleteTarget.name}"? This action cannot be undone.` : undefined}
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteModalOpen(false) })
          }
        }}
      />
    </div>
  )
}