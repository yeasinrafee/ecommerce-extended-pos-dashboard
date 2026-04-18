"use client"

import React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import CustomInput from "@/components/FormFields/CustomInput"
import Modal from "@/components/Common/Modal"
import CustomButton from "@/components/Common/CustomButton"

const schema = z.object({
  name: z.string().min(1, "Name is required")
})

type FormSchema = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultValues?: Partial<FormSchema>
  onSubmit?: (data: FormSchema) => Promise<void> | void
  submitting?: boolean
}

export default function CreateZone({ open, onOpenChange, defaultValues, onSubmit, submitting = false }: Props) {
  const isEdit = Boolean(defaultValues && defaultValues.name)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormSchema>({
    resolver: zodResolver(schema),
    defaultValues: { name: defaultValues?.name ?? "" }
  })

  React.useEffect(() => {
    reset({ name: defaultValues?.name ?? "" })
  }, [defaultValues, reset])

  const submit = async (data: FormSchema) => {
    if (onSubmit) await onSubmit(data)
    reset({ name: "" })
  }

  return (
    <Modal
      open={open}
      onOpenChange={(v) => onOpenChange(v)}
      title={isEdit ? "Update Zone" : "Create Zone"}
      description={isEdit ? "Edit zone" : "Create a new zone"}
      footer={
        <div className="flex gap-2">
          <CustomButton loading={isSubmitting || submitting} type="button" onClick={handleSubmit(submit)}>
            {isEdit ? "Update" : "Create"}
          </CustomButton>
        </div>
      }
    >
      <form onSubmit={handleSubmit(submit)}>
        <div className="space-y-4">
          <CustomInput label="Name" {...register("name" as any)} error={(errors as any).name?.message} requiredMark />
        </div>
      </form>
    </Modal>
  )
}