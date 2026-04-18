"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Modal from "@/components/Common/Modal";
import CustomInput from "@/components/FormFields/CustomInput";
import CustomButton from "@/components/Common/CustomButton";
import CustomFileUpload, { type CustomFileUploadFile } from "@/components/FormFields/CustomFileUpload";
import { useCreateSupplier, useUpdateSupplier } from "@/hooks/supplier.api";

const optionalText = z.preprocess((value) => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  return value;
}, z.string().optional());

const optionalEmail = z.preprocess((value) => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  return value;
}, z.string().email("A valid email is required").optional());

const schema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  email: optionalEmail,
  phone: optionalText,
  companyName: optionalText,
  address: optionalText,
});

type FormSchema = z.infer<typeof schema>;
type FormValues = z.input<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValues?: Partial<FormSchema> & { id?: number; image?: string | null };
}

export default function CreateSupplier({ open, onOpenChange, defaultValues }: Props) {
  const isEdit = Boolean(defaultValues?.id);
  const createMutation = useCreateSupplier();
  const updateMutation = useUpdateSupplier();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues, unknown, FormSchema>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      email: defaultValues?.email ?? "",
      phone: defaultValues?.phone ?? "",
      companyName: defaultValues?.companyName ?? "",
      address: defaultValues?.address ?? "",
    },
  });

  const [uploadedFiles, setUploadedFiles] = React.useState<CustomFileUploadFile[]>([]);
  const existingImage = defaultValues?.image;
  const showExistingImage = isEdit && existingImage && uploadedFiles.length === 0;

  React.useEffect(() => {
    if (!open) {
      setUploadedFiles([]);
    }
  }, [open]);

  React.useEffect(() => {
    reset({
      name: defaultValues?.name ?? "",
      email: defaultValues?.email ?? "",
      phone: defaultValues?.phone ?? "",
      companyName: defaultValues?.companyName ?? "",
      address: defaultValues?.address ?? "",
    });
    setUploadedFiles([]);
  }, [defaultValues, reset]);

  const submit = async (data: FormSchema) => {
    const formData = new FormData();
    formData.append("name", data.name);

    if (data.email) formData.append("email", data.email);
    if (data.phone) formData.append("phone", data.phone);
    if (data.companyName) formData.append("companyName", data.companyName);
    if (data.address) formData.append("address", data.address);

    if (uploadedFiles.length > 0) {
      formData.append("image", uploadedFiles[0].file, uploadedFiles[0].name);
    }

    if (isEdit && defaultValues?.id != null) {
      await updateMutation.mutateAsync({ id: defaultValues.id, payload: formData });
    } else {
      await createMutation.mutateAsync(formData);
    }

    setUploadedFiles([]);
    reset({ name: "", email: "", phone: "", companyName: "", address: "" });
    onOpenChange(false);
  };

  const loading = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      open={open}
      className="lg:max-w-[800px]"
      onOpenChange={onOpenChange}
      title={isEdit ? "Update Supplier" : "Create Supplier"}
      description={isEdit ? "Edit supplier details" : "Create a new supplier"}
      footer={
        <div className="flex w-full justify-center gap-2">
          <CustomButton loading={loading || isSubmitting} type="button" onClick={handleSubmit(submit)}>
            {isEdit ? "Update Supplier" : "Create Supplier"}
          </CustomButton>
        </div>
      }
    >
      <form onSubmit={handleSubmit(submit)}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CustomInput label="Name" {...register("name")} error={errors.name?.message} requiredMark />
            <CustomInput label="Email" type="email" {...register("email")} error={errors.email?.message} />

            <CustomInput label="Phone" {...register("phone")} error={errors.phone?.message} />
            <CustomInput label="Company Name" {...register("companyName")} error={errors.companyName?.message} />
          </div>

          <CustomInput label="Address" {...register("address")} error={errors.address?.message} />

          <div>
            <label className="block mb-2 text-sm font-medium">Profile Image</label>
            {showExistingImage ? (
              <div className="mb-2">
                <img src={existingImage} alt="Existing" className="h-32 w-32 object-cover rounded-md" />
                <p className="text-xs text-slate-500 mt-1">Existing image. Upload a new file below to replace.</p>
              </div>
            ) : null}
            <CustomFileUpload maxFiles={1} onFilesChange={setUploadedFiles} />
          </div>
        </div>
      </form>
    </Modal>
  );
}