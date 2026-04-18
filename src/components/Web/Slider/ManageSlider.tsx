"use client";

import React from "react";
import { toast } from "react-hot-toast";
import CreateSlider from "./CreateSlider";
import SliderTable from "./SliderTable";
import CustomButton from "@/components/Common/CustomButton";
import DeleteModal from "@/components/Common/DeleteModal";
import TableSkeleton from "@/components/Common/TableSkeleton";
import { type Slider, useAllSliders, useCreateSlider, useDeleteSlider, useReorderSliders, useUpdateSlider } from "@/hooks/web.api";

const sortBySerial = (items: Slider[]) => [...items].sort((a, b) => a.serial - b.serial);
const buildSignature = (items: Slider[]) => items.map((item) => `${item.id}:${item.serial}`).join("|");

const ManageSlider = () => {
  const { data: sliderData, isLoading, error } = useAllSliders();
  const createMutation = useCreateSlider();
  const updateMutation = useUpdateSlider();
  const deleteMutation = useDeleteSlider();
  const reorderMutation = useReorderSliders({ showToast: true });

  const [sliders, setSliders] = React.useState<Slider[]>([]);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Slider | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<Slider | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);

  const slidersRef = React.useRef<Slider[]>([]);
  const previousSlidersRef = React.useRef<Slider[]>([]);
  const lastSavedSignatureRef = React.useRef("");
  const saveInFlightRef = React.useRef(false);

  React.useEffect(() => {
    if (!sliderData) return;
    const normalized = sortBySerial(sliderData);
    setSliders(normalized);
    slidersRef.current = normalized;
    previousSlidersRef.current = normalized;
    lastSavedSignatureRef.current = buildSignature(normalized);
  }, [sliderData]);

  React.useEffect(() => {
    slidersRef.current = sliders;
  }, [sliders]);

  const flushOrder = React.useCallback(async () => {
    if (saveInFlightRef.current) return;

    const currentSnapshot = slidersRef.current;
    const currentSignature = buildSignature(currentSnapshot);
    if (currentSignature === lastSavedSignatureRef.current) return;

    previousSlidersRef.current = currentSnapshot;
    saveInFlightRef.current = true;

    try {
      await reorderMutation.mutateAsync(
        currentSnapshot.map((item) => ({ id: item.id, serial: item.serial })),
        {
          onError: (err) => {
            setSliders(previousSlidersRef.current);
            slidersRef.current = previousSlidersRef.current;
            lastSavedSignatureRef.current = buildSignature(previousSlidersRef.current);
            toast.error(err?.response?.data?.message || err?.message || "Failed to reorder sliders");
          },
        },
      );
      lastSavedSignatureRef.current = currentSignature;
    } finally {
      saveInFlightRef.current = false;

      const latestSignature = buildSignature(slidersRef.current);
      if (latestSignature !== lastSavedSignatureRef.current) {
        window.setTimeout(() => {
          void flushOrder();
        }, 0);
      }
    }
  }, [reorderMutation]);

  React.useEffect(() => {
    if (!sliders.length) return;
    const signature = buildSignature(sliders);
    if (signature === lastSavedSignatureRef.current) return;

    const timeout = window.setTimeout(() => {
      void flushOrder();
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [flushOrder, sliders]);

  const handleCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const handleEdit = (item: Slider) => {
    setEditing(item);
    setModalOpen(true);
  };

  const handleDelete = (item: Slider) => {
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

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-medium">Manage Sliders</h2>
            <p className="text-sm text-slate-500">Drag and drop rows to reorder homepage sliders.</p>
          </div>
          <CustomButton onClick={handleCreate}>Create new Slider</CustomButton>
        </div>
        <TableSkeleton />
      </div>
    );
  }

  if (error) {
    return <div className="p-6 text-center text-red-500">Failed to load sliders</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium">Manage Sliders</h2>
          <p className="text-sm text-slate-500">Drag and drop rows to reorder homepage sliders.</p>
        </div>
        <CustomButton onClick={handleCreate}>Create new Slider</CustomButton>
      </div>

      <SliderTable
        sliders={sliders}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onOrderChange={setSliders}
        savingOrder={reorderMutation.isPending || saveInFlightRef.current}
      />

      {modalOpen ? (
        <CreateSlider
          open={modalOpen}
          onOpenChange={setModalOpen}
          defaultValues={editing || undefined}
          onSubmit={handleSave}
          submitting={createMutation.isPending || updateMutation.isPending}
        />
      ) : null}

      {deleteModalOpen && deleteTarget ? (
        <DeleteModal
          open={deleteModalOpen}
          onOpenChange={setDeleteModalOpen}
          onConfirm={async () => {
            await deleteMutation.mutateAsync(deleteTarget.id);
            setDeleteModalOpen(false);
            setDeleteTarget(null);
          }}
          loading={deleteMutation.isPending}
          title="Delete Slider"
          description="Are you sure you want to delete this slider?"
        />
      ) : null}
    </div>
  );
};

export default ManageSlider;