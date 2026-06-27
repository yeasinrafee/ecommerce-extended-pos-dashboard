"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Modal from "@/components/Common/Modal";
import CustomInput from "@/components/FormFields/CustomInput";
import CustomButton from "@/components/Common/CustomButton";
import CustomSelect from "@/components/FormFields/CustomSelect";
import { useCreateLocation, useUpdateLocation } from "@/hooks/location.api";
import type { Location, LocationType, Status } from "@/hooks/location.api";

const schema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  code: z
    .string()
    .trim()
    .min(2, "Code must be at least 2 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Code must be alphanumeric, dashes, or underscores"),
  type: z.enum(["STORE", "WAREHOUSE"]),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  address: z.string().trim().optional().nullable(),
  phone: z.string().trim().optional().nullable(),
});

type FormSchema = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValues?: Partial<Location>;
}

export default function CreateLocation({ open, onOpenChange, defaultValues }: Props) {
  const isEdit = Boolean(defaultValues?.id);
  const createMutation = useCreateLocation();
  const updateMutation = useUpdateLocation();

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormSchema>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      code: defaultValues?.code ?? "",
      type: defaultValues?.type ?? "STORE",
      status: defaultValues?.status ?? "ACTIVE",
      address: defaultValues?.address ?? "",
      phone: defaultValues?.phone ?? "",
    },
  });

  React.useEffect(() => {
    if (!open) return;

    reset({
      name: defaultValues?.name ?? "",
      code: defaultValues?.code ?? "",
      type: defaultValues?.type ?? "STORE",
      status: defaultValues?.status ?? "ACTIVE",
      address: defaultValues?.address ?? "",
      phone: defaultValues?.phone ?? "",
    });
  }, [defaultValues, open, reset]);

  const submit = async (data: FormSchema) => {
    const payload = {
      name: data.name,
      code: data.code.toUpperCase(),
      type: data.type,
      status: data.status,
      address: data.address || null,
      phone: data.phone || null,
    };

    if (isEdit && defaultValues?.id) {
      await updateMutation.mutateAsync({ id: defaultValues.id, payload });
    } else {
      await createMutation.mutateAsync(payload);
    }

    onOpenChange(false);
  };

  const loading = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Update Location" : "Create Location"}
      description={isEdit ? "Edit location details" : "Create a new inventory location (Store or Warehouse)"}
      footer={
        <div className="flex w-full justify-end gap-2">
          <CustomButton variant="outline" type="button" onClick={() => onOpenChange(false)}>
            Cancel
          </CustomButton>
          <CustomButton loading={loading || isSubmitting} type="button" onClick={handleSubmit(submit)}>
            {isEdit ? "Update Location" : "Create Location"}
          </CustomButton>
        </div>
      }
    >
      <form onSubmit={handleSubmit(submit)}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <CustomInput label="Name" {...register("name")} error={errors.name?.message} requiredMark />
            <CustomInput label="Code" {...register("code")} error={errors.code?.message} requiredMark />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <CustomSelect
              name="type"
              control={control}
              label="Location Type"
              requiredMark
              options={[
                { label: "Store", value: "STORE" },
                { label: "Warehouse", value: "WAREHOUSE" },
              ]}
            />
            <CustomSelect
              name="status"
              control={control}
              label="Status"
              requiredMark
              options={[
                { label: "Active", value: "ACTIVE" },
                { label: "Inactive", value: "INACTIVE" },
              ]}
            />
          </div>

          <CustomInput label="Phone (Optional)" {...register("phone")} error={errors.phone?.message} />
          
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">Address (Optional)</label>
            <textarea
              {...register("address")}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Full address of the location..."
            />
            {errors.address && (
              <p className="text-xs text-destructive mt-1">{errors.address.message}</p>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
}
