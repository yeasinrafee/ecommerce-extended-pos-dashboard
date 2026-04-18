"use client"

import React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import CustomInput from "@/components/FormFields/CustomInput"
import Modal from "@/components/Common/Modal"
import CustomButton from "@/components/Common/CustomButton"
import CustomFileUpload, { type CustomFileUploadFile } from "@/components/FormFields/CustomFileUpload"

const schema = z.object({
  name: z.string().min(1, "Name is required"),
})

type FormSchema = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultValues?: Partial<FormSchema> & { image?: string; parentId?: string | null }
  onSubmit?: (data: FormSchema | FormData) => Promise<void> | void
  submitting?: boolean
  kind?: 'product' | 'blog'
  initialParentId?: string | null
}

export default function CreateCategory({
  open,
  onOpenChange,
  defaultValues,
  onSubmit,
  submitting = false,
  kind = 'product',
  initialParentId,
}: Props) {
  const isEdit = Boolean(defaultValues && defaultValues.name)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormSchema>({
    resolver: zodResolver(schema),
    defaultValues: { name: defaultValues?.name ?? "" },
  })

  React.useEffect(() => {
    reset({ name: defaultValues?.name ?? "" })
  }, [defaultValues, reset])

  const [uploadedFiles, setUploadedFiles] = React.useState<CustomFileUploadFile[]>([])
  const existingImage = (defaultValues as any)?.image as string | undefined
  const showExistingImage = Boolean(defaultValues && existingImage && uploadedFiles.length === 0)

  const submit = async (data: FormSchema) => {
    if (onSubmit) {
      if (uploadedFiles && uploadedFiles.length > 0) {
        const formData = new FormData()
        formData.append("name", data.name)
        formData.append("image", uploadedFiles[0].file)
        const parentId = initialParentId ?? (defaultValues as any)?.parentId;
        if (parentId) formData.append("parentId", parentId)
        await onSubmit(formData as any)
      } else {
        const parentId = initialParentId ?? (defaultValues as any)?.parentId;
        const payload = parentId ? { ...data, parentId } : data;
        await onSubmit(payload as any)
      }
    }
    reset({ name: "" });
  }

  return (
    <Modal
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v)
      }}
      title={isEdit ? "Update Category" : "Create Category"}
      description={isEdit ? "Edit category details" : "Create a new category"}
      footer={
        <div className="flex justify-center w-full gap-2">
          <CustomButton loading={isSubmitting || submitting} type="button" onClick={handleSubmit(submit)}>
            {isEdit ? "Update Category" : "Create Category"}
          </CustomButton>
        </div>
      }
    >
      <form onSubmit={handleSubmit(submit)}>
        <div className="space-y-4">
          <CustomInput
            label="Name"
            {...register("name")}
            error={errors.name?.message}
            requiredMark
          />
          {/* Parent selection removed — use "Create Subcategory" action in list to create subcategories */}
          <div>
            <label className="block mb-2 text-sm font-medium">Image</label>
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
  )
}