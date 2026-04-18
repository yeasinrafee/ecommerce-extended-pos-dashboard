"use client"

import React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import CustomInput from "@/components/FormFields/CustomInput"
import Modal from "@/components/Common/Modal"
import CustomButton from "@/components/Common/CustomButton"
import { X } from "lucide-react"

const schema = z.object({
  name: z.string().min(1, "Name is required"),
})

type FormSchema = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultValues?: { name?: string; values?: string[] }
  onSubmit?: (data: { name: string; values?: string[] }) => Promise<void> | void
  submitting?: boolean
}

export default function CreateAttribute({ open, onOpenChange, defaultValues, onSubmit, submitting = false }: Props) {
  const isEdit = Boolean(defaultValues && defaultValues.name)
  const initialValuesRef = React.useRef<string[]>(defaultValues?.values ?? [])

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<FormSchema>({
    resolver: zodResolver(schema),
    defaultValues: { name: defaultValues?.name ?? "" }
  })

  const nameValue = watch("name")

  const [tags, setTags] = React.useState<string[]>(defaultValues?.values ?? [])
  const [tagInput, setTagInput] = React.useState<string>("")

  React.useEffect(() => {
    reset({ name: defaultValues?.name ?? "" })
    setTags(defaultValues?.values ?? [])
    setTagInput("")
    initialValuesRef.current = defaultValues?.values ?? []
  }, [defaultValues, reset])

  const addTagsFromInput = () => {
    if (!tagInput) return
    const parts = tagInput.split(",").map((s) => s.trim()).filter(Boolean)
    if (parts.length === 0) {
      setTagInput("")
      return
    }

    setTags((prev) => {
      const next = [...prev]
      for (const p of parts) {
        if (!next.includes(p)) next.push(p)
      }
      return next
    })
    setTagInput("")
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTagsFromInput()
    }
  }

  const removeTag = (idx: number) => {
    if (isEdit && initialValuesRef.current.includes(tags[idx])) {
      return
    }

    setTags((prev) => prev.filter((_, i) => i !== idx))
  }

  const initialName = defaultValues?.name ?? ""
  const hasName = Boolean(nameValue?.trim())
  const hasAtLeastOneValue = tags.length > 0
  const hasEditedName = nameValue.trim() !== initialName.trim()
  const hasEditedValues = tags.length !== initialValuesRef.current.length
    || tags.some((tag, index) => tag !== initialValuesRef.current[index])

  const isCreateDisabled = !hasName || !hasAtLeastOneValue
  const isEditDisabled = !(hasEditedName || hasEditedValues)

  const submit = async (data: FormSchema) => {
    if (onSubmit) {
      await onSubmit({ name: data.name, values: tags })
    }

    reset({ name: "" })
    setTags([])
    setTagInput("")
  }

  return (
    <Modal
      open={open}
      onOpenChange={(v) => onOpenChange(v)}
      title={isEdit ? "Update Attribute" : "Create Attribute"}
      description={isEdit ? "Edit attribute details" : "Create a new attribute"}
      footer={
        <div className="flex justify-center w-full gap-2">
          <CustomButton
            loading={isSubmitting || submitting}
            disabled={isEdit ? isEditDisabled : isCreateDisabled}
            type="button"
            onClick={handleSubmit(submit)}
          >
            {isEdit ? "Update Attribute" : "Create Attribute"}
          </CustomButton>
        </div>
      }
    >
      <form onSubmit={handleSubmit(submit)}>
        <div className="space-y-4">
          <CustomInput label="Name" {...register("name")} error={errors.name?.message} requiredMark />

          <div>
            <label className="block text-sm font-medium mb-2">Values</label>
            <div className="flex gap-2">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a value and press Enter or comma"
                className="rounded-md border px-3 py-2 w-full"
              />
              <CustomButton onClick={addTagsFromInput} type="button">Add</CustomButton>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Press Enter or comma to add. You can also paste comma-separated values.</p>

            <div className="mt-3 flex flex-wrap gap-2">
              {tags.map((t, i) => (
                <div key={t + i} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted text-muted-foreground text-sm">
                  <span>{t}</span>
                  {!(isEdit && initialValuesRef.current.includes(t)) ? (
                    <button type="button" onClick={() => removeTag(i)} className="p-1 rounded-full hover:bg-muted/50">
                      <X size={14} />
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </form>
    </Modal>
  )
}
