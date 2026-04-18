"use client"

import React from "react"
import Table, { type Column } from "@/components/Common/Table"
import TableSkeleton from "@/components/Common/TableSkeleton";
import CustomButton from "@/components/Common/CustomButton"
import DeleteModal from "@/components/Common/DeleteModal"
import SearchBar from "@/components/FormFields/SearchBar"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { MoreHorizontal } from "lucide-react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { usePaginatedBlogs, useDeleteBlog } from "@/hooks/blog.api"

export default function ManageBlogs() {
  const router = useRouter()
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

  const { data: paged, isLoading, isError } = usePaginatedBlogs(page, limit, searchTerm)

  const blogs = paged?.data ?? []
  const total = paged?.meta?.total ?? 0

  const [deleteTarget, setDeleteTarget] = React.useState<any | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false)
  const deleteBlogMutation = useDeleteBlog()

  const handleCreate = () => {
    router.push("/dashboard/blog/create")
  }

  const handleEdit = (item: any) => {
    router.push(`/dashboard/blog/create?id=${item.id}`)
  }

  const handleDelete = (item: any) => {
    setDeleteTarget(item)
    setDeleteModalOpen(true)
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    deleteBlogMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteModalOpen(false)
        setDeleteTarget(null)
      }
    })
  }

  const columns = React.useMemo<Column<any>[]>(
    () => [
      { header: "Image", cell: (row) => row.image ? <Image src={row.image} alt="" width={60} height={40} className="object-cover size-[60px]" /> : null },
      { header: "Title", accessor: "title" },
      { header: "Author", accessor: "authorName" },
      { header: "Category", cell: (row) => (row.category?.name || "-") },
      { header: "Tags", cell: (row) => {
        if (!row.tags || !row.tags.length) return "-";
        return row.tags
          .map((bt: any) => {
            const tag = bt.tag ? bt.tag : bt;
            return tag?.name || "";
          })
          .filter((n: string) => !!n)
          .join(", ");
      } },
      { header: "Created", accessor: "createdAt", cell: (row) => new Date(row.createdAt).toLocaleString() }
    ],
    []
  )

  return (
    <div>
      <h2 className="mb-4 text-lg font-medium">Manage Blogs</h2>

      <div className="flex items-center justify-between mb-4">
        <SearchBar searchInput={searchInput} setSearchInput={setSearchInput} clearSearch={() => setSearchInput("")} />
        <CustomButton onClick={handleCreate}>Create Blog</CustomButton>
      </div>

      <Table<any>
        columns={columns}
        data={blogs}
        rowKey="id"
        pageSize={limit}
        serverSide={true}
        currentPage={page}
        totalItems={total}
        onPageChange={setPage}
        renderRowActions={(item) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon"><MoreHorizontal /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleEdit(item)}>Edit</DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={() => handleDelete(item)}>Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      />

      <DeleteModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title="Confirm deletion"
        description={deleteTarget ? `Are you sure you want to delete blog "${deleteTarget.title}"? This action cannot be undone.` : undefined}
        loading={(deleteBlogMutation as any).isPending || (deleteBlogMutation as any).isLoading}
        onConfirm={confirmDelete}
      />
    </div>
  )
}