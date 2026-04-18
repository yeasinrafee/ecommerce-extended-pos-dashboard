"use client"

import React from "react"
import Table, { type Column } from "@/components/Common/Table"
import TableSkeleton from "@/components/Common/TableSkeleton";
import CustomButton from "@/components/Common/CustomButton"
import CreateSocialMedia from "./CreateSocialMedia"
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
import { SocialMedia, useAllSocialMedia, useCreateSocialMedia, useDeleteSocialMedia, useUpdateSocialMedia } from "@/hooks/web.api"

export default function ManageSocialMediaLink() {
  const [modalOpen, setModalOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<SocialMedia | null>(null)

  // search state
  const [searchInput, setSearchInput] = React.useState("")
  const [searchTerm, setSearchTerm] = React.useState<string | undefined>(undefined)

  const { data: socialMediaLinks, isLoading, error } = useAllSocialMedia()
  const createMutation = useCreateSocialMedia()
  const updateMutation = useUpdateSocialMedia()
  const deleteMutation = useDeleteSocialMedia()

  const handleCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const handleEdit = (item: SocialMedia) => {
    setEditing(item)
    setModalOpen(true)
  }

  const [deleteTarget, setDeleteTarget] = React.useState<SocialMedia | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false)

  const handleDelete = (item: SocialMedia) => {
    setDeleteTarget(item)
    setDeleteModalOpen(true)
  }

  const handleSave = async (payload: { name: string; link: string }) => {
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, payload })
    } else {
      await createMutation.mutateAsync(payload)
    }
    setModalOpen(false)
    setEditing(null)
  }

  const filteredData = React.useMemo(() => {
    if (!socialMediaLinks) return []
    if (!searchInput.trim()) return socialMediaLinks
    return socialMediaLinks.filter(item => 
      item.name.toLowerCase().includes(searchInput.toLowerCase()) ||
      item.link.toLowerCase().includes(searchInput.toLowerCase())
    )
  }, [socialMediaLinks, searchInput])

  const columns = React.useMemo<Column<SocialMedia>[]>(
    () => [
      {
        header: "Platform",
        accessor: "name",
      },
      {
        header: "Link",
        accessor: "link",
        cell: (row) => (
          <a href={row.link} target="_blank" rel="noopener noreferrer" className="text-brand-primary hover:underline">
            {row.link}
          </a>
        ),
      },
    ],
    [],
  )

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium">Manage Social Media Links</h2>

      <div className="flex items-center justify-between mb-4">
        <SearchBar
          searchInput={searchInput}
          setSearchInput={setSearchInput}
          clearSearch={() => setSearchInput("")}
        />
        <CustomButton onClick={handleCreate}>Add Social Media</CustomButton>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : error ? (
        <p className="text-red-500">Failed to load social media links</p>
      ) : (
        <Table<SocialMedia>
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
        <CreateSocialMedia
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
          title="Delete Social Media Link"
          description={`Are you sure you want to delete the link for ${deleteTarget.name}?`}
        />
      )}
    </div>
  )
}