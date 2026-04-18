"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import CustomInput from "@/components/FormFields/CustomInput";
import CustomTextArea from "@/components/FormFields/CustomTextArea";
import CustomFileUpload, { type CustomFileUploadFile } from "@/components/FormFields/CustomFileUpload";
import Modal from "@/components/Common/Modal";
import CustomButton from "@/components/Common/CustomButton";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  designation: z.string().min(1, "Designation is required"),
  rating: z.string()
    .min(1, "Rating is required")
    .refine((val) => !isNaN(parseFloat(val)), "Rating must be a number")
    .refine((val) => {
      const n = parseFloat(val);
      return n >= 1 && n <= 5;
    }, "Rating must be between 1 and 5")
    .transform((val) => parseFloat(val)),
  comment: z.string().min(1, "Comment is required"),
  image: z.any().optional(),
});

type FormSchema = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValues?: any;
  onSubmit?: (data: any) => Promise<void> | void;
  submitting?: boolean;
}

export default function CreateTestimonial({
  open,
  onOpenChange,
  defaultValues,
  onSubmit,
  submitting = false,
}: Props) {
  const isEdit = Boolean(defaultValues && defaultValues.id);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    
    formState: { errors, isSubmitting },
  } = useForm<any>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      designation: defaultValues?.designation ?? "",
      rating: defaultValues?.rating?.toString() ?? "",
      comment: defaultValues?.comment ?? "",
    },
  });
  const [uploadedFiles, setUploadedFiles] = React.useState<CustomFileUploadFile[]>([]);
  const existingImage = defaultValues?.image;
  const showExistingImage = isEdit && existingImage && uploadedFiles.length === 0;

  React.useEffect(() => {
    if (open) {
      reset({
        name: defaultValues?.name ?? "",
        designation: defaultValues?.designation ?? "",
        rating: defaultValues?.rating?.toString() ?? "",
        comment: defaultValues?.comment ?? "",
      });
      setUploadedFiles([]);
      clearErrors("image");
    }
  }, [defaultValues, reset, open, clearErrors]);

  React.useEffect(() => {
    if (uploadedFiles.length > 0) {
      clearErrors("image");
    }
  }, [uploadedFiles, clearErrors]);

  const submit = async (data: any) => {
    if (!onSubmit) return;

    if (!isEdit && uploadedFiles.length === 0) {
      setError("image", { type: "manual", message: "Image is required" });
      return;
    }

    if (isEdit && uploadedFiles.length === 0 && !existingImage) {
      setError("image", { type: "manual", message: "Image is required" });
      return;
    }

    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("designation", data.designation);
    formData.append("rating", data.rating.toString());
    formData.append("comment", data.comment);

    if (uploadedFiles && uploadedFiles.length > 0) {
      formData.append("image", uploadedFiles[0].file);
    }

    await onSubmit(formData);
  };

  return (
    <Modal
      open={open}
      className="max-h-[90vh] overflow-y-auto mr-4 w-full md:max-w-[600px]"
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
      title={isEdit ? "Update Testimonial" : "Add Testimonial"}
      description={isEdit ? "Edit testimonial details" : "Add a new customer testimonial"}
      footer={
        <div className="flex gap-2 w-full justify-center">
          <CustomButton
            loading={isSubmitting || submitting}
            type="button"
            onClick={handleSubmit(submit)}
          >
            {isEdit ? "Update Testimonial" : "Create Testimonial"}
          </CustomButton>
        </div>
      }
    >
      <form onSubmit={handleSubmit(submit)}>
        <div className="space-y-4">
          <div>
            <label className="block mb-2 text-sm font-medium">Image</label>
            {showExistingImage ? (
              <div className="mb-2">
                <img src={existingImage} alt="Existing" className="h-32 w-32 object-cover rounded-md" />
                <p className="text-xs text-slate-500 mt-1">Existing image. Upload a new file below to replace.</p>
              </div>
            ) : null}
            <CustomFileUpload maxFiles={1} onFilesChange={setUploadedFiles} requiredMark />
            {errors.image?.message ? (
              <p className="mt-2 text-xs font-medium text-destructive">{String(errors.image?.message)}</p>
            ) : null}
          </div>
          <CustomInput
            label="Name"
            placeholder="e.g. John Doe"
            {...register("name")}
            error={errors.name?.message as string}
            requiredMark
          />
          <CustomInput
            label="Designation"
            placeholder="e.g. CEO, Tech Corp"
            {...register("designation")}
            error={errors.designation?.message as string}
            requiredMark
          />
          <CustomInput
            label="Rating"
            type="float"
            step="0.1"
            min={1}
            max={5}
            placeholder="e.g. 4.5"
            {...register("rating")}
            error={errors.rating?.message as string}
            requiredMark
          />
          <CustomTextArea
            label="Comment"
            placeholder="What did they say?"
            {...register("comment")}
            error={errors.comment?.message as string}
            requiredMark
            className="min-h-[100px]"
          />
        </div>
      </form>
    </Modal>
  );
}
