"use client"

import React from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Check, ChevronsUpDown, Search } from "lucide-react"
import CustomInput from "@/components/FormFields/CustomInput"
import Modal from "@/components/Common/Modal"
import CustomButton from "@/components/Common/CustomButton"
import CustomFileUpload, { type CustomFileUploadFile } from "@/components/FormFields/CustomFileUpload"
import { cn } from "@/lib/utils"
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

export default function CreateSubcategory({
  open,
  onOpenChange,
  onSubmit,
  submitting = false,
  defaultValues,
}: Props) {
  const isEdit = Boolean(defaultValues)
  const [comboOpen, setComboOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const searchRef = React.useRef<HTMLInputElement>(null)
  const comboRef = React.useRef<HTMLDivElement>(null)

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormSchema>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      parentId: defaultValues?.parentId ?? "",
    },
  })

  React.useEffect(() => {
    reset({ name: defaultValues?.name ?? "", parentId: defaultValues?.parentId ?? "" })
    setUploadedFiles([])
    setComboOpen(false)
    setSearch("")
  }, [open, reset, defaultValues])

  // focus search when dropdown opens
  React.useEffect(() => {
    if (comboOpen) {
      setTimeout(() => searchRef.current?.focus(), 30)
    } else {
      setSearch("")
    }
  }, [comboOpen])

  // close on click outside the combo wrapper
  React.useEffect(() => {
    if (!comboOpen) return
    const handler = (e: MouseEvent) => {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) {
        setComboOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [comboOpen])

  const [uploadedFiles, setUploadedFiles] = React.useState<CustomFileUploadFile[]>([])

  const categoriesQuery = productApi.useAllCategories()
  const parents = (categoriesQuery.data ?? []).filter((c) => !c.parentId)
  const options = parents.map((p) => ({ label: p.name, value: p.id }))

  const filteredOptions = React.useMemo(() => {
    if (!search.trim()) return options
    const term = search.toLowerCase()
    return options.filter((o) => o.label.toLowerCase().includes(term))
  }, [options, search])

  const existingImage = defaultValues?.image as string | undefined
  const showExistingImage = Boolean(defaultValues && existingImage && uploadedFiles.length === 0)
  const hasChanges = !isEdit || isDirty || uploadedFiles.length > 0

  const submit = async (data: FormSchema) => {
    if (onSubmit) {
      if (uploadedFiles.length > 0) {
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
      description={
        isEdit
          ? "Edit subcategory details"
          : "Create a new subcategory and assign it to a parent category"
      }
      footer={
        <div className="flex w-full justify-center gap-2">
          <CustomButton
            loading={isSubmitting || submitting}
            disabled={isEdit ? !hasChanges : false}
            type="button"
            onClick={handleSubmit(submit)}
          >
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

          {/* ── Parent Category Combobox ── */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">
              Parent Category <span className="text-red-500">*</span>
            </label>

            <Controller
              control={control}
              name="parentId"
              render={({ field }) => (
                /*
                 * Render inline (no Portal) so it stays inside the Dialog DOM
                 * tree — avoids Radix Dialog's focus-trap treating the dropdown
                 * as "outside" and dismissing it on every interaction.
                 */
                <div ref={comboRef} className="relative w-full">
                  {/* Trigger button */}
                  <button
                    type="button"
                    role="combobox"
                    aria-expanded={comboOpen}
                    aria-haspopup="listbox"
                    onClick={() => setComboOpen((v) => !v)}
                    className={cn(
                      "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm",
                      "focus:outline-none focus:ring-1 focus:ring-ring",
                      !field.value && "text-muted-foreground"
                    )}
                  >
                    <span className="truncate">
                      {field.value
                        ? options.find((o) => o.value === field.value)?.label
                        : "Select parent category"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </button>

                  {/* Dropdown — absolutely positioned, no portal */}
                  {comboOpen && (
                    <div
                      className="absolute left-0 right-0 top-[calc(100%+4px)] z-200 rounded-md border bg-popover shadow-lg text-popover-foreground"
                      // prevent clicks inside the dropdown from bubbling to
                      // anything that might close it
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      {/* Search */}
                      <div className="flex items-center gap-2 border-b px-3">
                        <Search className="h-4 w-4 shrink-0 opacity-50" />
                        <input
                          ref={searchRef}
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="Search categories..."
                          className="flex h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                          onKeyDown={(e) => {
                            if (e.key === "Escape") {
                              e.stopPropagation()
                              setComboOpen(false)
                            }
                            if (e.key === "Enter") e.preventDefault()
                          }}
                        />
                      </div>

                      {/* Scrollable list */}
                      <ul
                        role="listbox"
                        className="overflow-y-auto py-1"
                        style={{ maxHeight: "200px" }}
                      >
                        {filteredOptions.length === 0 ? (
                          <li className="py-6 text-center text-sm text-muted-foreground">
                            No category found.
                          </li>
                        ) : (
                          filteredOptions.map((option) => (
                            <li
                              key={option.value}
                              role="option"
                              aria-selected={field.value === option.value}
                              // mousedown fires before blur; keeps dropdown open
                              onMouseDown={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                field.onChange(option.value)
                                setComboOpen(false)
                              }}
                              className={cn(
                                "relative flex cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm",
                                "hover:bg-accent hover:text-accent-foreground",
                                field.value === option.value && "bg-accent/50 font-medium"
                              )}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4 shrink-0",
                                  field.value === option.value ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {option.label}
                            </li>
                          ))
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            />

            {errors.parentId && (
              <p className="text-xs text-red-500">{errors.parentId.message}</p>
            )}
          </div>

          {/* ── Image upload ── */}
          <div>
            <label className="block mb-2 text-sm font-medium">Image</label>
            {showExistingImage ? (
              <div className="mb-2">
                <img
                  src={existingImage}
                  alt="Existing"
                  className="h-32 w-32 object-cover rounded-md"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Existing image. Upload a new file below to replace.
                </p>
              </div>
            ) : null}
            <CustomFileUpload maxFiles={1} onFilesChange={setUploadedFiles} />
          </div>
        </div>
      </form>
    </Modal>
  )
}
