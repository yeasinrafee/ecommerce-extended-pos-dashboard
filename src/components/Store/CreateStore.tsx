"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Modal from "@/components/Common/Modal";
import CustomInput from "@/components/FormFields/CustomInput";
import CustomButton from "@/components/Common/CustomButton";
import { useCreateStore, useUpdateStore } from "@/hooks/store.api";

const schema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  address: z.string().trim().min(2, "Address is required"),
});

type FormSchema = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValues?: Partial<FormSchema> & { id?: string };
}

export default function CreateStore({ open, onOpenChange, defaultValues }: Props) {
  const isEdit = Boolean(defaultValues?.id);
  const createMutation = useCreateStore();
  const updateMutation = useUpdateStore();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormSchema>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      address: defaultValues?.address ?? "",
    },
  });

  React.useEffect(() => {
    if (!open) return;

    reset({
      name: defaultValues?.name ?? "",
      address: defaultValues?.address ?? "",
    });
  }, [defaultValues, open, reset]);

  const submit = async (data: FormSchema) => {
    const payload = { name: data.name, address: data.address };

    if (isEdit && defaultValues?.id) {
      await updateMutation.mutateAsync({ id: defaultValues.id, payload });
    } else {
      await createMutation.mutateAsync(payload);
    }

    reset({ name: "", address: "" });
    onOpenChange(false);
  };

  const loading = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Update Store" : "Create Store"}
      description={isEdit ? "Edit store details" : "Create a new store or branch"}
      footer={
        <div className="flex w-full justify-center gap-2">
          <CustomButton loading={loading || isSubmitting} type="button" onClick={handleSubmit(submit)}>
            {isEdit ? "Update Store" : "Create Store"}
          </CustomButton>
        </div>
      }
    >
      <form onSubmit={handleSubmit(submit)}>
        <div className="space-y-4">
          <CustomInput label="Name" {...register("name")} error={errors.name?.message} requiredMark />
          <CustomInput label="Address" {...register("address")} error={errors.address?.message} requiredMark />
        </div>
      </form>
    </Modal>
  );
}