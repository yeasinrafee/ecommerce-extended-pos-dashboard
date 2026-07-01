"use client"

import React from "react"
import Image from "next/image"
import Table, { type Column } from "@/components/Common/Table"
import TableSkeleton from "@/components/Common/TableSkeleton"
import CustomButton from "@/components/Common/CustomButton"
import CreateCategory from "./CreateCategory"
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
import { initialsPlaceholder } from "@/utils/image-placeholder"

type ActiveTab = "categories" | "subcategories"

export default function ManageProductCategories() {
  const [activeTab, setActiveTab] = React.useState<ActiveTab>("categories")

  // ── Category tab state ────────────────────────────────────────────
  const [catModalOpen, setCatModalOpen] = React.useState(false)
  const [catEditing, setCatEditing] = React.useState<Category | null>(null)
  const [catPage, setCatPage] = React.useState(1)
  const [catSearchInput, setCatSearchInput] = React.useState("")
  const [catSearchTerm, setCatSearchTerm] = React.useState<string | undefined>(undefined)
  const [newSubParentId, setNewSubParentId] = React.useState<string | undefined>(undefined)
  const [catDeleteTarget, setCatDeleteTarget] = React.useState<Category | null>(null)
  const [catDeleteModalOpen, setCatDeleteModalOpen] = React.useState(false)

  // ── Subcategory tab state ─────────────────────────────────────────
  const [subModalOpen, setSubModalOpen] = React.useState(false)
  const [subEditing, setSubEditing] = React.useState<Category | null>(null)
  const [subPage, setSubPage] = React.useState(1)
  const [subSearchInput, setSubSearchInput] = React.useState("")
  const [subSearchTerm, setSubSearchTerm] = React.useState<string | undefined>(undefined)
  const [subDeleteTarget, setSubDeleteTarget] = React.useState<Category | null>(null)
  const [subDeleteModalOpen, setSubDeleteModalOpen] = React.useState(false)

  const limit = 10

  // debounce searches
  React.useEffect(() => {
    const h = setTimeout(() => {
      setCatPage(1)
      setCatSearchTerm(catSearchInput.trim() || undefined)
    }, 500)
    return () => clearTimeout(h)
  }, [catSearchInput])

  React.useEffect(() => {
    const h = setTimeout(() => {
      setSubPage(1)
      setSubSearchTerm(subSearchInput.trim() || undefined)
    }, 500)
    return () => clearTimeout(h)
  }, [subSearchInput])

  // ── API calls ─────────────────────────────────────────────────────
  const categoriesQuery = productApi.useParentPaginatedCategories(catPage, limit, catSearchTerm)
  const { data, isLoading, error } = categoriesQuery

  const allQuery = productApi.useAllCategories()
  const all = allQuery.data ?? []

  const createMutation = productApi.useCreateCategory()
  const updateMutation = productApi.useUpdateCategory()
  const deleteMutation = productApi.useDeleteCategory()

  // ── Subcategory filtering (client-side) ───────────────────────────
  const filteredSubs = React.useMemo(() => {
    const rows = all.filter((c) => c.parentId)
    if (!subSearchTerm) return rows
    const term = subSearchTerm.toLowerCase()
    return rows.filter((r) => {
      const parent = all.find((p) => p.id === r.parentId)
      return (
        r.name.toLowerCase().includes(term) ||
        (parent?.name ?? "").toLowerCase().includes(term)
      )
    })
  }, [all, subSearchTerm])

  const subTotal = filteredSubs.length
  const subPageItems = React.useMemo(
    () => filteredSubs.slice((subPage - 1) * limit, subPage * limit),
    [filteredSubs, subPage]
  )

  // ── Category handlers ─────────────────────────────────────────────
  const handleCreateCategory = () => {
    setCatEditing(null)
    setNewSubParentId(undefined)
    setCatModalOpen(true)
  }

  const handleEditCategory = (cat: Category) => {
    setCatEditing(cat)
    setCatModalOpen(true)
  }

  const handleSaveCategory = async (payload: FormData | { name: string; parentId?: string }) => {
    if (catEditing) {
      if (payload instanceof FormData) {
        await updateMutation.mutateAsync({ id: catEditing.id, payload })
      } else {
        await updateMutation.mutateAsync({ id: catEditing.id, payload: payload as any })
      }
    } else {
      if (payload instanceof FormData) {
        await createMutation.mutateAsync(payload)
      } else {
        await createMutation.mutateAsync(payload as any)
      }
    }
    setCatModalOpen(false)
  }

  // ── Subcategory handlers ──────────────────────────────────────────
  const handleCreateSubcategory = () => {
    setSubEditing(null)
    setSubModalOpen(true)
  }

  const handleEditSubcategory = (cat: Category) => {
    setSubEditing(cat)
    setSubModalOpen(true)
  }

  const handleSaveSubcategory = async (payload: FormData | { name: string; parentId?: string }) => {
    if (subEditing) {
      if (payload instanceof FormData) {
        await updateMutation.mutateAsync({ id: subEditing.id, payload })
      } else {
        await updateMutation.mutateAsync({ id: subEditing.id, payload: payload as any })
      }
    } else {
      if (payload instanceof FormData) {
        await createMutation.mutateAsync(payload)
      } else {
        await createMutation.mutateAsync(payload as any)
      }
    }
    setSubModalOpen(false)
    setSubEditing(null)
  }

  // ── Columns ───────────────────────────────────────────────────────
  const categoryColumns = React.useMemo<Column<Category>[]>(
    () => [
      {
        header: "Category",
        cell: (row) => {
          const image = (row as any).image ?? null
          const { initials, backgroundColor } = initialsPlaceholder(row.name ?? "")
          return (
            <div className="flex items-center gap-3">
              {image ? (
                <Image
                  src={image}
                  alt={row.name}
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-sm object-cover"
                />
              ) : (
                <div
                  className="h-8 w-8 rounded-sm flex items-center justify-center text-sm font-medium text-black"
                  style={{ backgroundColor }}
                >
                  {initials}
                </div>
              )}
              <span className="font-medium">{row.name}</span>
            </div>
          )
        },
      },
      {
        header: "Subcategories",
        cell: (row) => {
          const subs = (row as any).subCategories as Category[] | undefined
          if (!subs || subs.length === 0) return "-"
          return subs.map((s) => s.name).join(" · ")
        },
      },
      {
        header: "Subcategory Count",
        cell: (row) => (row as any).subCategories?.length ?? 0,
        align: "center",
      },
      {
        header: "Products",
        cell: (row) => (
          <span className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            {(row as any).productCount ?? 0}
          </span>
        ),
        align: "center",
      },
    ],
    []
  )

  const subcategoryColumns = React.useMemo<Column<Category>[]>(
    () => [
      {
        header: "Subcategory",
        cell: (row) => {
          const image = (row as any).image ?? null
          const { initials, backgroundColor } = initialsPlaceholder(row.name ?? "")
          return (
            <div className="flex items-center gap-3">
              {image ? (
                <Image
                  src={image}
                  alt={row.name}
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-sm object-cover"
                />
              ) : (
                <div
                  className="h-8 w-8 rounded-sm flex items-center justify-center text-sm font-medium text-black"
                  style={{ backgroundColor }}
                >
                  {initials}
                </div>
              )}
              <span className="font-medium">{row.name}</span>
            </div>
          )
        },
      },
      {
        header: "Parent Category",
        cell: (row) => {
          const parent = all.find((p) => p.id === row.parentId)
          return parent ? parent.name : "-"
        },
      },
      {
        header: "Products",
        cell: (row) => (
          <span className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            {(row as any).productCount ?? 0}
          </span>
        ),
        align: "center",
      },
    ],
    [all]
  )

  return (
    <div>
      <h2 className="mb-4 text-lg font-medium">Product Categories</h2>

      {/* ── Top bar: search + action buttons ── */}
      <div className="flex items-center justify-between mb-4">
        {activeTab === "categories" ? (
          <SearchBar
            searchInput={catSearchInput}
            setSearchInput={setCatSearchInput}
            clearSearch={() => setCatSearchInput("")}
          />
        ) : (
          <SearchBar
            searchInput={subSearchInput}
            setSearchInput={setSubSearchInput}
            clearSearch={() => setSubSearchInput("")}
          />
        )}

        <div className="flex gap-2">
          <CustomButton variant="outline" onClick={handleCreateSubcategory}>
            Create Sub-Category
          </CustomButton>
          <CustomButton onClick={handleCreateCategory}>Create Category</CustomButton>
        </div>
      </div>

      {/* ── Tab switcher (below search bar) ── */}
      <div className="flex gap-0 border-b border-slate-200 mb-4">
        <button
          onClick={() => setActiveTab("categories")}
          className={`px-5 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === "categories"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          Categories
        </button>
        <button
          onClick={() => setActiveTab("subcategories")}
          className={`px-5 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === "subcategories"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          Sub-Categories
        </button>
      </div>

      {/* ── Categories tab ── */}
      {activeTab === "categories" && (
        <>

          {isLoading ? (
            <TableSkeleton />
          ) : error ? (
            <p className="text-red-500">Failed to load categories</p>
          ) : (
            <Table<Category>
              columns={categoryColumns}
              data={data?.data ?? []}
              rowKey="id"
              pageSize={limit}
              serverSide
              currentPage={catPage}
              totalItems={data?.meta.total ?? 0}
              onPageChange={setCatPage}
              renderRowActions={(cat) => (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleEditCategory(cat)}>
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => { setCatDeleteTarget(cat); setCatDeleteModalOpen(true); }}
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            />
          )}
        </>
      )}

      {/* ── Subcategories tab ── */}
      {activeTab === "subcategories" && (
        <>

          {!allQuery.isLoading && all.filter((c) => !c.parentId).length === 0 ? (
            <p className="text-slate-500 text-sm">No parent categories found. Create a category first.</p>
          ) : allQuery.isLoading ? (
            <TableSkeleton />
          ) : allQuery.isError ? (
            <p className="text-red-500">Failed to load subcategories</p>
          ) : (
            <Table<Category>
              columns={subcategoryColumns}
              data={subPageItems}
              rowKey="id"
              pageSize={limit}
              serverSide={false}
              currentPage={subPage}
              totalItems={subTotal}
              onPageChange={setSubPage}
              renderRowActions={(cat) => (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleEditSubcategory(cat)}>
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => { setSubDeleteTarget(cat); setSubDeleteModalOpen(true); }}
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            />
          )}
        </>
      )}

      {/* ── Category modal ── */}
      <CreateCategory
        open={catModalOpen}
        onOpenChange={(v) => {
          setCatModalOpen(v)
          if (!v) {
            setCatEditing(null)
            setNewSubParentId(undefined)
          }
        }}
        defaultValues={
          catEditing
            ? {
                name: catEditing.name,
                image: (catEditing as any).image,
                parentId: (catEditing as any).parentId ?? null,
              }
            : undefined
        }
        initialParentId={catEditing ? (catEditing as any).parentId ?? undefined : newSubParentId}
        submitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={handleSaveCategory}
        kind="product"
      />

      {/* ── Subcategory modal ── */}
      <CreateSubcategory
        open={subModalOpen}
        onOpenChange={(v) => {
          setSubModalOpen(v)
          if (!v) setSubEditing(null)
        }}
        defaultValues={
          subEditing
            ? {
                name: subEditing.name,
                parentId: subEditing.parentId ?? undefined,
                image: (subEditing as any).image,
              }
            : undefined
        }
        submitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={handleSaveSubcategory}
      />

      {/* ── Category delete modal ── */}
      <DeleteModal
        open={catDeleteModalOpen}
        onOpenChange={setCatDeleteModalOpen}
        title="Confirm deletion"
        description={
          catDeleteTarget
            ? `Are you sure you want to delete "${catDeleteTarget.name}"? This cannot be undone.`
            : undefined
        }
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (catDeleteTarget) {
            deleteMutation.mutate(catDeleteTarget.id, {
              onSuccess: () => setCatDeleteModalOpen(false),
            })
          }
        }}
      />

      {/* ── Subcategory delete modal ── */}
      <DeleteModal
        open={subDeleteModalOpen}
        onOpenChange={setSubDeleteModalOpen}
        title="Confirm deletion"
        description={
          subDeleteTarget
            ? `Are you sure you want to delete "${subDeleteTarget.name}"? This cannot be undone.`
            : undefined
        }
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (subDeleteTarget) {
            deleteMutation.mutate(subDeleteTarget.id, {
              onSuccess: () => setSubDeleteModalOpen(false),
            })
          }
        }}
      />
    </div>
  )
}
