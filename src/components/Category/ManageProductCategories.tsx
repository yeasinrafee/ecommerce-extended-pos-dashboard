"use client"

import React from "react"
import Image from "next/image"
import Table, { type Column } from "@/components/Common/Table"
import TableSkeleton from "@/components/Common/TableSkeleton";
import CustomButton from "@/components/Common/CustomButton"
import CreateCategory from "./CreateCategory"
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

export default function ManageProductCategories() {
  const [modalOpen, setModalOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Category | null>(null)
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

  const api = productApi

  const categoriesQuery = api.useParentPaginatedCategories(page, limit, searchTerm)
  const { data, isLoading, error } = categoriesQuery
  const createMutation = api.useCreateCategory()
  const updateMutation = api.useUpdateCategory()
  const deleteMutation = api.useDeleteCategory()

  const handleCreate = () => {
    setEditing(null)
    setNewSubParentId(undefined)
    setModalOpen(true)
  }


  const [newSubParentId, setNewSubParentId] = React.useState<string | undefined>(undefined)

  const handleCreateSubcategory = (parent: Category) => {
    setEditing(null)
    setNewSubParentId(parent.id)
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

  const handleSaveCategory = async (payload: FormData | { name: string; parentId?: string }) => {
    if (editing) {
      if (payload instanceof FormData) {
        await updateMutation.mutateAsync({ id: editing.id, payload })
      } else {
        await updateMutation.mutateAsync({ id: editing.id, payload: payload as any })
        setEditing((prev) => (prev ? { ...prev, name: payload.name, parentId: payload.parentId ?? null } : prev))
      }
    } else {
      if (payload instanceof FormData) {
        await createMutation.mutateAsync(payload)
      } else {
        await createMutation.mutateAsync(payload as any)
      }
    }

    setModalOpen(false)
  }


  const columns = React.useMemo<Column<Category>[]>(() => {
    const base: Column<Category>[] = [
      {
        header: "Category",
        cell: (row) => {
          // product categories include an `image` field
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
        },
      },
      {
        header: "Subcategories",
        cell: (row) => {
          const subs = (row as any).subCategories as Category[] | undefined;
          if (!subs || subs.length === 0) return "-";
          return subs.map((s) => s.name).join(" - ");
        }
      },
      {
        header: "Subcategory Count",
        cell: (row) => (row as any).subCategories?.length ?? 0,
        align: "center",
      }
    ];

    base.push({
      header: "Products",
      cell: () => "-",
      align: "center",
    });

    return base;
  }, [])

  return (
    <div>
      <h2 className="mb-4 text-lg font-medium">Manage Product Categories</h2>

      <div className="flex items-center justify-between mb-4">
        <SearchBar
          searchInput={searchInput}
          setSearchInput={setSearchInput}
          clearSearch={() => setSearchInput("")}
        />
        <div>
          <CustomButton onClick={handleCreate}>Create Category</CustomButton>
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : error ? (
        <p className="text-red-500">Failed to load categories</p>
      ) : (
        <Table<Category>
          columns={columns}
          data={data?.data ?? []}
          rowKey="id"
          pageSize={limit}
          serverSide
          currentPage={page}
          totalItems={data?.meta.total ?? 0}
          onPageChange={setPage}
          renderRowActions={(cat) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {/* <DropdownMenuItem onClick={() => handleCreateSubcategory(cat)}>
                  Create Subcategory
                </DropdownMenuItem> */}
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

      <CreateCategory
        open={modalOpen}
        onOpenChange={(v) => {
          setModalOpen(v);
          if (!v) setNewSubParentId(undefined);
        }}
        defaultValues={editing ? { name: editing.name, image: (editing as any).image, parentId: (editing as any).parentId ?? null } : undefined}
        initialParentId={editing ? (editing as any).parentId ?? undefined : newSubParentId}
        submitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={handleSaveCategory}
        kind="product"
      />

      

      <DeleteModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title="Confirm deletion"
        description={deleteTarget ? `Are you sure you want to delete category "${deleteTarget.name}"? This action cannot be undone.` : undefined}
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
