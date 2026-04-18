"use client"

import React from "react"
import Image from "next/image"
import Table, { type Column } from "@/components/Common/Table"
import TableSkeleton from "@/components/Common/TableSkeleton";
import CustomButton from "@/components/Common/CustomButton"
import CreateSubcategory from "./CreateSubcategory"
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
import * as productApi from "@/hooks/product-category.api"
import type { Category } from "@/hooks/product-category.api"
import { initialsPlaceholder } from "@/utils/image-placeholder";

export default function ManageProductSubcategories() {
  const [modalOpen, setModalOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Category | null>(null)
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

  const allQuery = productApi.useAllCategories()
  const all = allQuery.data ?? []

  // filter subcategories (those that have a parentId)
  const filtered = React.useMemo(() => {
    const rows = all.filter((c) => c.parentId)
    if (!searchTerm) return rows
    const term = searchTerm.toLowerCase()
    return rows.filter((r) => {
      const parent = all.find((p) => p.id === r.parentId)
      const parentName = parent?.name ?? ""
      return r.name.toLowerCase().includes(term) || parentName.toLowerCase().includes(term)
    })
  }, [all, searchTerm])

  const total = filtered.length
  const pageItems = React.useMemo(() => filtered.slice((page - 1) * limit, page * limit), [filtered, page])

  const createMutation = productApi.useCreateCategory()
  const updateMutation = productApi.useUpdateCategory()
  const deleteMutation = productApi.useDeleteCategory()

  const handleCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const handleEdit = (cat: Category) => {
    setEditing(cat)
    setModalOpen(true)
  }

  const [deleteTarget, setDeleteTarget] = React.useState<Category | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false)

  const handleDelete = (cat: Category) => {
    setDeleteTarget(cat)
    setDeleteModalOpen(true)
  }

  const handleSave = async (payload: FormData | { name: string; parentId?: string }) => {
    if (editing) {
      if (payload instanceof FormData) {
        await updateMutation.mutateAsync({ id: editing.id, payload })
      } else {
        await updateMutation.mutateAsync({ id: editing.id, payload: payload as any })
      }
    } else {
      if (payload instanceof FormData) {
        await createMutation.mutateAsync(payload)
      } else {
        await createMutation.mutateAsync(payload as any)
      }
    }

    setModalOpen(false)
    setEditing(null)
  }

  const columns = React.useMemo<Column<Category>[]>(() => {
    return [
      {
        header: "Subcategory",
        cell: (row) => {
          const image = (row as any).image ?? null;
          const { initials, backgroundColor } = initialsPlaceholder(row.name ?? "");

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
          )
        }
      },
      {
        header: "Parent",
        cell: (row) => {
          const parent = all.find((p) => p.id === row.parentId)
          return parent ? parent.name : '-'
        }
      },
      {
        header: "Products",
        cell: () => '-',
        align: 'center'
      }
    ]
  }, [all])

  return (
    <div>
      <h2 className="mb-4 text-lg font-medium">Manage Product Subcategories</h2>

      <div className="flex items-center justify-between mb-4">
        <SearchBar
          searchInput={searchInput}
          setSearchInput={setSearchInput}
          clearSearch={() => setSearchInput("")}
        />
        <CustomButton onClick={handleCreate}>Create Sub-Category</CustomButton>
      </div>

      {!allQuery.isLoading && all.length === 0 ? (
        <p>No categories available. Create a parent category first.</p>
      ) : null}

      {allQuery.isLoading ? (
        <TableSkeleton />
      ) : allQuery.isError ? (
        <p className="text-red-500">Failed to load categories</p>
      ) : (
        <Table<Category>
          columns={columns}
          data={pageItems}
          rowKey="id"
          pageSize={limit}
          serverSide={false}
          currentPage={page}
          totalItems={total}
          onPageChange={setPage}
          renderRowActions={(cat) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleEdit(cat)}>
                  Edit
                </DropdownMenuItem>
                {/* <DropdownMenuItem
                  variant="destructive"
                  onClick={() => handleDelete(cat)}
                >
                  Delete
                </DropdownMenuItem> */}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        />
      )}

      <CreateSubcategory
        open={modalOpen}
        onOpenChange={(v) => {
          setModalOpen(v)
          if (!v) setEditing(null)
        }}
        defaultValues={editing ? { name: editing.name, parentId: editing.parentId ?? undefined, image: (editing as any).image } : undefined}
        submitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={handleSave}
      />

      <DeleteModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title="Confirm deletion"
        description={deleteTarget ? `Are you sure you want to delete subcategory "${deleteTarget.name}"? This action cannot be undone.` : undefined}
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
