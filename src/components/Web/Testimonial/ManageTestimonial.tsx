"use client";

import React from "react";
import Table, { type Column } from "@/components/Common/Table";
import TableSkeleton from "@/components/Common/TableSkeleton";
import CustomButton from "@/components/Common/CustomButton";
import CreateTestimonial from "./CreateTestimonial";
import DeleteModal from "@/components/Common/DeleteModal";
import SearchBar from "@/components/FormFields/SearchBar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import { Testimonial, useAllTestimonials, useCreateTestimonial, useDeleteTestimonial, useUpdateTestimonial } from "@/hooks/web.api";
import Image from "next/image";

export default function ManageTestimonial() {
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Testimonial | null>(null);

  // search state
  const [searchInput, setSearchInput] = React.useState("");

  const { data: testimonials, isLoading, error } = useAllTestimonials();
  const createMutation = useCreateTestimonial();
  const updateMutation = useUpdateTestimonial();
  const deleteMutation = useDeleteTestimonial();

  const handleCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const handleEdit = (item: Testimonial) => {
    setEditing(item);
    setModalOpen(true);
  };

  const [deleteTarget, setDeleteTarget] = React.useState<Testimonial | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);

  const handleDelete = (item: Testimonial) => {
    setDeleteTarget(item);
    setDeleteModalOpen(true);
  };

  const handleSave = async (payload: FormData) => {
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    setModalOpen(false);
    setEditing(null);
  };

  const filteredData = React.useMemo(() => {
    if (!testimonials) return [];
    if (!searchInput.trim()) return testimonials;
    return testimonials.filter(item => 
      item.name.toLowerCase().includes(searchInput.toLowerCase()) ||
      item.designation.toLowerCase().includes(searchInput.toLowerCase()) ||
      item.comment.toLowerCase().includes(searchInput.toLowerCase())
    );
  }, [testimonials, searchInput]);

  const columns = React.useMemo<Column<Testimonial>[]>(
    () => [
      {
        header: "Image",
        accessor: "image",
        cell: (row) => (
          <div>
            {row.image ? (
              <Image 
                src={row.image} 
                alt={row.name} 
                width={100}
                height={100}
                className="object-cover size-[50px] rounded-sm" 
              />
            ) : (
              <div className="h-full w-full bg-gray-200 flex items-center justify-center text-[10px] text-gray-500">
                NoImg
              </div>
            )}
          </div>
        )
      },
      {
        header: "Name",
        accessor: "name",
      },
      {
        header: "Designation",
        accessor: "designation",
      },
      {
        header: "Rating",
        accessor: "rating",
        cell: (row) => <span>{row.rating.toFixed(1)}</span>
      },
      {
        header: "Comment",
        accessor: "comment",
        cell: (row) => (
          <div className="max-w-md line-clamp-2 whitespace-pre-wrap break-words" title={row.comment}>
            {row.comment}
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium">Manage Testimonials</h2>

      <div className="flex items-center justify-between mb-4">
        <SearchBar
          searchInput={searchInput}
          setSearchInput={setSearchInput}
          clearSearch={() => setSearchInput("")}
        />
        <CustomButton onClick={handleCreate}>Create new Testimonial</CustomButton>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : error ? (
        <p className="text-red-500">Failed to load testimonials</p>
      ) : (
        <Table<Testimonial>
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
        <CreateTestimonial
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
            await deleteMutation.mutateAsync(deleteTarget.id);
            setDeleteModalOpen(false);
          }}
          loading={deleteMutation.isPending}
          title="Delete Testimonial"
          description={`Are you sure you want to delete the testimonial for: "${deleteTarget.name}"?`}
        />
      )}
    </div>
  );
}
