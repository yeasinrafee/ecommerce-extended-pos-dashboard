"use client"

import React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import CustomInput from "@/components/FormFields/CustomInput"
import Modal from "@/components/Common/Modal"
import CustomButton from "@/components/Common/CustomButton"
import CustomFileUpload, { type CustomFileUploadFile } from "@/components/FormFields/CustomFileUpload"
import CustomSelect from "@/components/FormFields/CustomSelect"
import * as productApi from "@/hooks/product-category.api"

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  parentId: z.string().min(1, "Parent category is required"),
})

type FormSchema = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit?: (data: FormSchema | FormData) => Promise<void> | void
  submitting?: boolean
  defaultValues?: Partial<{ name: string; parentId?: string; image?: string }>
}

export default function CreateSubcategory({ open, onOpenChange, onSubmit, submitting = false, defaultValues }: Props) {
  const isEdit = Boolean(defaultValues)
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormSchema>({
    resolver: zodResolver(schema),
    defaultValues: { name: defaultValues?.name ?? "", parentId: defaultValues?.parentId ?? "" },
  })

  React.useEffect(() => {
    reset({ name: defaultValues?.name ?? "", parentId: defaultValues?.parentId ?? "" })
    setUploadedFiles([])
  }, [open, reset, defaultValues])

  const [uploadedFiles, setUploadedFiles] = React.useState<CustomFileUploadFile[]>([])

  const categoriesQuery = productApi.useAllCategories()
  const parents = (categoriesQuery.data ?? []).filter((c) => !c.parentId)

  const options = parents.map((p) => ({ label: p.name, value: p.id }))

  const existingImage = defaultValues?.image as string | undefined
  const showExistingImage = Boolean(defaultValues && existingImage && uploadedFiles.length === 0)
  const hasChanges = !isEdit || isDirty || uploadedFiles.length > 0

  const submit = async (data: FormSchema) => {
    if (onSubmit) {
      if (uploadedFiles && uploadedFiles.length > 0) {
        const formData = new FormData()
        formData.append("name", data.name)
        formData.append("parentId", data.parentId)
        formData.append("image", uploadedFiles[0].file)
        await onSubmit(formData as any)
      } else {
        await onSubmit({ name: data.name, parentId: data.parentId })
      }
    }

    reset({ name: defaultValues?.name ?? "", parentId: defaultValues?.parentId ?? "" })
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit Subcategory" : "Create Subcategory"}
      description={isEdit ? "Edit subcategory details" : "Create a new subcategory and assign it to a parent category"}
      footer={
        <div className="flex w-full justify-center gap-2">
          <CustomButton loading={isSubmitting || submitting} disabled={isEdit ? !hasChanges : false} type="button" onClick={handleSubmit(submit)}>
            {isEdit ? "Update Sub-category" : "Create Sub-category"}
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

          <CustomSelect
            name={"parentId"}
            control={control}
            label="Parent Category"
            options={options}
            placeholder="Select parent category"
          />

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
