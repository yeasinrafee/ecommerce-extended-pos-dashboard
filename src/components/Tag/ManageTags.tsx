"use client"

import React from "react"
import Table, { type Column } from "@/components/Common/Table"
import TableSkeleton from "@/components/Common/TableSkeleton";
import CustomButton from "@/components/Common/CustomButton"
import CreateTag from "./CreateTag"
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
import * as productApi from "@/hooks/product-tag.api"
import * as blogApi from "@/hooks/blog-tag.api"
import type { Tag } from "@/hooks/product-tag.api"

export default function ManageTags({ kind = 'product' }: { kind?: 'product' | 'blog' }) {
  const [modalOpen, setModalOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Tag | null>(null)
  const [page, setPage] = React.useState(1)
  const limit = 10

  // search state
  const [searchInput, setSearchInput] = React.useState("")
  const [searchTerm, setSearchTerm] = React.useState<string | undefined>(undefined)

  // debounce search input by 500ms
  React.useEffect(() => {
    const handle = setTimeout(() => {
      setPage(1) // reset to first page when searching
      setSearchTerm(searchInput.trim() || undefined)
    }, 500)
    return () => clearTimeout(handle)
  }, [searchInput])

  const api = kind === 'blog' ? blogApi : productApi

  const tagsQuery = api.usePaginatedTags(page, limit, searchTerm)
  const { data, isLoading, error } = tagsQuery
  const createMutation = api.useCreateTag()
  const updateMutation = api.useUpdateTag()
  const deleteMutation = api.useDeleteTag()

  const handleCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const handleEdit = (tag: Tag) => {
    setEditing(tag)
    setModalOpen(true)
  }

  const [deleteTarget, setDeleteTarget] = React.useState<Tag | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false)

  const handleDelete = (tag: Tag) => {
    setDeleteTarget(tag)
    setDeleteModalOpen(true)
  }

  const handleSaveTag = async (payload: { name: string }) => {
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, name: payload.name })
      setEditing((prev) => (prev ? { ...prev, name: payload.name } : prev))
    } else {
      await createMutation.mutateAsync(payload.name)
    }

    setModalOpen(false)
  }

  const columns = React.useMemo<Column<Tag>[]>(
    () => [
      {
        header: "Tag",
        accessor: "name",
      },
      {
        header: "Products",
        cell: () => "-",
        align: "center",
      },
    ],
    [],
  )

  return (
    <div>
      <h2 className="mb-4 text-lg font-medium">{kind === 'blog' ? 'Manage Blog Tags' : 'Manage Product Tags'}</h2>

      <div className="flex items-center justify-between mb-4">
        <SearchBar
          searchInput={searchInput}
          setSearchInput={setSearchInput}
          clearSearch={() => setSearchInput("")}
        />
        <CustomButton onClick={handleCreate}>Create Tag</CustomButton>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : error ? (
        <p className="text-red-500">Failed to load tags</p>
      ) : (
        <Table<Tag>
          columns={columns}
          data={data?.data ?? []}
          rowKey="id"
          pageSize={limit}
          serverSide
          currentPage={page}
          totalItems={data?.meta.total ?? 0}
          onPageChange={setPage}
          renderRowActions={(tag) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleEdit(tag)}>
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => handleDelete(tag)}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        />
      )}

      <CreateTag
        open={modalOpen}
        onOpenChange={setModalOpen}
        defaultValues={editing ? { name: editing.name } : undefined}
        submitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={handleSaveTag}
      />

      <DeleteModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title="Confirm deletion"
        description={deleteTarget ? `Are you sure you want to delete tag "${deleteTarget.name}"? This action cannot be undone.` : undefined}
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
