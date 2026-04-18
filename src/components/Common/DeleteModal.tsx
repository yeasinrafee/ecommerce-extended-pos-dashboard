"use client"

import React from "react";
import Modal from "@/components/Common/Modal";
import CustomButton from "@/components/Common/CustomButton";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
}

export default function DeleteModal({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  loading = false,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
}: Props) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      footer={
        <div className="flex justify-start gap-2">
          <CustomButton variant="primary" className="text-black bg-gray-200" onClick={() => onOpenChange(false)} disabled={loading}>{cancelLabel}</CustomButton>
          <CustomButton variant="primary" className="text-white bg-red-500" loading={loading} onClick={() => onConfirm()}>{confirmLabel}</CustomButton>
        </div>
      }
    />
  );
}
