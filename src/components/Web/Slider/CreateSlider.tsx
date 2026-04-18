"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import CustomInput from "@/components/FormFields/CustomInput";
import CustomFileUpload, { type CustomFileUploadFile } from "@/components/FormFields/CustomFileUpload";
import Modal from "@/components/Common/Modal";
import CustomButton from "@/components/Common/CustomButton";
import { type Slider } from "@/hooks/web.api";

const schema = z.object({
  link: z
    .string()
    .trim()
    .optional()
    .refine((value) => {
      if (!value) return true;
      return z.string().url().safeParse(value).success;
    }, {
      message: "Link must be a valid URL (e.g. https://example.com)",
    }),
});

type FormSchema = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValues?: Partial<Omit<Slider, "serial">>;
  onSubmit?: (data: FormData) => Promise<void> | void;
  submitting?: boolean;
}

export default function CreateSlider({
  open,
  onOpenChange,
  defaultValues,
  onSubmit,
  submitting = false,
}: Props) {
  const isEdit = Boolean(defaultValues?.id);
  const existingImage = defaultValues?.image ?? null;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormSchema>({
    resolver: zodResolver(schema),
    defaultValues: {
      link: defaultValues?.link ?? "",
    },
  });

  const [uploadedFiles, setUploadedFiles] = React.useState<CustomFileUploadFile[]>([]);
  const [imageError, setImageError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      reset({ link: defaultValues?.link ?? "" });
      setUploadedFiles([]);
      setImageError(null);
    }
  }, [defaultValues, open, reset]);

  React.useEffect(() => {
    if (uploadedFiles.length > 0) {
      setImageError(null);
    }
  }, [uploadedFiles]);

  const submit = async (data: FormSchema) => {
    if (!onSubmit) return;

    if (!isEdit && uploadedFiles.length === 0) {
      setImageError("Image is required");
      return;
    }

    if (isEdit && uploadedFiles.length === 0 && !existingImage) {
      setImageError("Image is required");
      return;
    }

    const formData = new FormData();
    formData.append("link", data.link ?? "");

    if (uploadedFiles.length > 0) {
      formData.append("image", uploadedFiles[0].file);
    }

    await onSubmit(formData);
  };

  return (
    <Modal
      open={open}
      className="max-h-[90vh] overflow-y-auto mr-4 w-full md:max-w-160"
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
      title={isEdit ? "Update Slider" : "Add Slider"}
      description={isEdit ? "Edit slider image and link" : "Add a new homepage slider"}
      footer={
        <div className="flex gap-2 w-full justify-center">
          <CustomButton
            loading={isSubmitting || submitting}
            type="button"
            onClick={handleSubmit(submit)}
          >
            {isEdit ? "Update Slider" : "Create Slider"}
          </CustomButton>
        </div>
      }
    >
      <form onSubmit={handleSubmit(submit)}>
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium">Image</label>
            {isEdit && existingImage && uploadedFiles.length === 0 ? (
              <div className="mb-3 space-y-2">
                <img
                  src={existingImage}
                  alt="Existing slider"
                  className="h-40 w-full rounded-lg border border-slate-200 object-cover"
                />
                <p className="text-xs text-slate-500">Upload a new image to replace the current one.</p>
              </div>
            ) : null}
            <CustomFileUpload maxFiles={1} onFilesChange={setUploadedFiles} requiredMark />
            {imageError ? <p className="mt-2 text-xs font-medium text-destructive">{imageError}</p> : null}
          </div>

          <CustomInput
            label="Link"
            placeholder="https://example.com"
            {...register("link")}
            error={errors.link?.message as string}
          />
        </div>
      </form>
    </Modal>
  );
}