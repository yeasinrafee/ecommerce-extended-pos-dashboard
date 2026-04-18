"use client"

import React from 'react'
import CustomTextArea from "@/components/FormFields/CustomTextArea"
import CustomFileUpload, { CustomFileUploadFile } from "@/components/FormFields/CustomFileUpload"
import CustomButton from "@/components/Common/CustomButton"
import { useCompanyPolicy, useCreateCompanyPolicy, useUpdateCompanyPolicy } from "@/hooks/web.api"
import { X } from "lucide-react"
import WebFormSkeleton from "@/components/Common/WebFormSkeleton"

const CompanyPolicy = () => {
  const { data: policy, isLoading: isFetching } = useCompanyPolicy()
  const createMutation = useCreateCompanyPolicy()
  const updateMutation = useUpdateCompanyPolicy()

  const [termsOfService, setTermsOfService] = React.useState("")
  const [termsAndConditions, setTermsAndConditions] = React.useState("")
  const [privacyPolicy, setPrivacyPolicy] = React.useState("")
  const [refundPolicy, setRefundPolicy] = React.useState("")
  const [shippingPolicy, setShippingPolicy] = React.useState("")
  const [imageFiles, setImageFiles] = React.useState<CustomFileUploadFile[]>([])
  const [removedExistingSizeChart, setRemovedExistingSizeChart] = React.useState(false)

  React.useEffect(() => {
    if (policy) {
      setTermsOfService(policy.termsOfService ?? "")
      setTermsAndConditions(policy.termsAndConditions ?? "")
      setPrivacyPolicy(policy.privacyPolicy ?? "")
      setRefundPolicy(policy.refundPolicy ?? "")
      setShippingPolicy(policy.shippingPolicy ?? "")
      setRemovedExistingSizeChart(false)
    }
  }, [policy])

  const isSaving = createMutation.isPending || updateMutation.isPending
  const isEdit = !!policy?.id

  const hasChanges = React.useMemo(() => {
    if (!isEdit || !policy) return true

    return (
      (policy.termsOfService ?? "") !== termsOfService ||
      (policy.termsAndConditions ?? "") !== termsAndConditions ||
      (policy.privacyPolicy ?? "") !== privacyPolicy ||
      (policy.refundPolicy ?? "") !== refundPolicy ||
      (policy.shippingPolicy ?? "") !== shippingPolicy ||
      removedExistingSizeChart ||
      imageFiles.length > 0
    )
  }, [isEdit, policy, termsOfService, termsAndConditions, privacyPolicy, refundPolicy, shippingPolicy, removedExistingSizeChart, imageFiles.length])

  const handleSave = async () => {
    const fd = new FormData()
    fd.append("termsOfService", termsOfService)
    fd.append("termsAndConditions", termsAndConditions)
    fd.append("privacyPolicy", privacyPolicy)
    fd.append("refundPolicy", refundPolicy)
    fd.append("shippingPolicy", shippingPolicy)

    if (imageFiles.length > 0) {
      fd.append("sizeChart", imageFiles[0].file)
    } else if (removedExistingSizeChart) {
      fd.append("sizeChart", "")
    }

    try {
      if (isEdit) {
        await updateMutation.mutateAsync(fd as any)
      } else {
        await createMutation.mutateAsync(fd as any)
      }
    } catch (error) {
    }
  }

  if (isFetching) {
    return <WebFormSkeleton fields={5} hasBanner={true} />
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 bg-background rounded-xl shadow-sm border border-slate-200">
      <div className="space-y-1">
        <h2 className="lg:text-2xl font-bold text-slate-900">Company Policies</h2>
        <p className="text-sm text-slate-500">Manage legal documents and store policies.</p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <div className="space-y-4">
          <label className="block text-sm font-semibold text-slate-700">
            Size Chart Image
          </label>
          <CustomFileUpload 
            maxFiles={1} 
            onFilesChange={(files) => setImageFiles(files)} 
            description="Upload size chart image (PNG, JPG, JPEG, or WEBP up to 5MB)"
          />
          {policy?.sizeChart && imageFiles.length === 0 && !removedExistingSizeChart && (
            <div className="mt-3 relative inline-block">
              <img 
                src={policy.sizeChart} 
                alt="Size Chart" 
                className="h-32 w-auto object-contain rounded-lg border border-slate-200 p-2" 
              />
              <button
                type="button"
                className="absolute -top-2 -right-2 bg-white text-slate-500 p-1 rounded-full shadow-md border border-slate-100 hover:text-destructive transition-colors"
                onClick={() => setRemovedExistingSizeChart(true)}
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <CustomTextArea
            label="Terms of Service"
            placeholder="Service terms..."
            value={termsOfService}
            onValueChange={(v) => setTermsOfService(v as string)}
            rows={6}
          />
        </div>

        <div className="space-y-2">
          <CustomTextArea
            label="Terms and Conditions"
            placeholder="Main terms and conditions..."
            value={termsAndConditions}
            onValueChange={(v) => setTermsAndConditions(v as string)}
            rows={6}
          />
        </div>

        <div className="space-y-2">
          <CustomTextArea
            label="Privacy Policy"
            placeholder="Data usage and privacy rules..."
            value={privacyPolicy}
            onValueChange={(v) => setPrivacyPolicy(v as string)}
            rows={6}
          />
        </div>

        <div className="space-y-2">
          <CustomTextArea
            label="Refund Policy"
            placeholder="Return and refund procedures..."
            value={refundPolicy}
            onValueChange={(v) => setRefundPolicy(v as string)}
            rows={6}
          />
        </div>

        <div className="space-y-2">
          <CustomTextArea
            label="Shipping Policy"
            placeholder="Delivery terms and timelines..."
            value={shippingPolicy}
            onValueChange={(v) => setShippingPolicy(v as string)}
            rows={6}
          />
        </div>
      </div>

      <div className="flex justify-center pt-4 border-t border-slate-100">
        <CustomButton
          onClick={handleSave}
          loading={isSaving}
          disabled={isSaving || (isEdit && !hasChanges)}
          className="w-full md:max-w-[300px] px-8"
        >
          {policy?.id ? "Update Policies" : "Save Policies"}
        </CustomButton>
      </div>
    </div>
  )
}

export default CompanyPolicy
