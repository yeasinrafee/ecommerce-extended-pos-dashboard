"use client"

import React from "react"
import Table, { type Column } from "@/components/Common/Table"
import TableSkeleton from "@/components/Common/TableSkeleton";
import CustomButton from "@/components/Common/CustomButton"
import CreateFaq from "./CreateFaq"
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
import { FAQ, useAllFaqs, useCreateFaq, useDeleteFaq, useUpdateFaq } from "@/hooks/web.api"

export default function ManageFaq() {
  const [modalOpen, setModalOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<FAQ | null>(null)

  // search state
  const [searchInput, setSearchInput] = React.useState("")

  const { data: faqs, isLoading, error } = useAllFaqs()
  const createMutation = useCreateFaq()
  const updateMutation = useUpdateFaq()
  const deleteMutation = useDeleteFaq()

  const handleCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const handleEdit = (item: FAQ) => {
    setEditing(item)
    setModalOpen(true)
  }

  const [deleteTarget, setDeleteTarget] = React.useState<FAQ | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false)

  const handleDelete = (item: FAQ) => {
    setDeleteTarget(item)
    setDeleteModalOpen(true)
  }

  const handleSave = async (payload: { question: string; answer: string }) => {
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, payload })
    } else {
      await createMutation.mutateAsync(payload)
    }
    setModalOpen(false)
    setEditing(null)
  }

  const filteredData = React.useMemo(() => {
    if (!faqs) return []
    if (!searchInput.trim()) return faqs
    return faqs.filter(item => 
      item.question.toLowerCase().includes(searchInput.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchInput.toLowerCase())
    )
  }, [faqs, searchInput])

  const columns = React.useMemo<Column<FAQ>[]>(
    () => [
      {
        header: "Question",
        accessor: "question",
      },
      {
        header: "Answer",
        accessor: "answer",
        cell: (row) => (
          <div className="max-w-md line-clamp-2 whitespace-pre-wrap break-words" title={row.answer}>
            {row.answer}
          </div>
        ),
      },
    ],
    [],
  )

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium">Manage FAQs</h2>

      <div className="flex items-center justify-between mb-4">
        <SearchBar
          searchInput={searchInput}
          setSearchInput={setSearchInput}
          clearSearch={() => setSearchInput("")}
        />
        <CustomButton onClick={handleCreate}>Create new FAQ</CustomButton>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : error ? (
        <p className="text-red-500">Failed to load FAQs</p>
      ) : (
        <Table<FAQ>
          columns={columns}
          data={filteredData || []}
          rowKey="id"
          renderRowActions={(item) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleEdit(item)}>
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleDelete(item)}
                  className="text-destructive"
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        />
      )}

      {modalOpen && (
        <CreateFaq
          open={modalOpen}
          onOpenChange={setModalOpen}
          defaultValues={editing || undefined}
          onSubmit={handleSave}
          submitting={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {deleteModalOpen && deleteTarget && (
        <DeleteModal
          open={deleteModalOpen}
          onOpenChange={setDeleteModalOpen}
          onConfirm={async () => {
            await deleteMutation.mutateAsync(deleteTarget.id)
            setDeleteModalOpen(false)
          }}
          loading={deleteMutation.isPending}
          title="Delete FAQ"
          description={`Are you sure you want to delete the FAQ: "${deleteTarget.question}"?`}
        />
      )}
    </div>
  )
}
