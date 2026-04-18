"use client"

import React from 'react'
import CustomInput from "@/components/FormFields/CustomInput"
import CustomTextArea from "@/components/FormFields/CustomTextArea"
import CustomFileUpload, { CustomFileUploadFile } from "@/components/FormFields/CustomFileUpload"
import CustomButton from "@/components/Common/CustomButton"
import { useCompanyInformation, useCreateCompanyInformation, useUpdateCompanyInformation } from "@/hooks/web.api"
import { X } from "lucide-react"
import WebFormSkeleton from "@/components/Common/WebFormSkeleton"

const CreateCompanyInformation = () => {
  const { data: companyInfo, isLoading: isFetching } = useCompanyInformation()
  const createMutation = useCreateCompanyInformation()
  const updateMutation = useUpdateCompanyInformation()

  const [email, setEmail] = React.useState("")
  const [address, setAddress] = React.useState("")
  const [phone, setPhone] = React.useState("")
  const [shortDescription, setShortDescription] = React.useState("")
  const [workingHours, setWorkingHours] = React.useState("")
  const [imageFiles, setImageFiles] = React.useState<CustomFileUploadFile[]>([])
  const [footerLogoFiles, setFooterLogoFiles] = React.useState<CustomFileUploadFile[]>([])
  const [removedExistingLogo, setRemovedExistingLogo] = React.useState(false)
  const [removedExistingFooterLogo, setRemovedExistingFooterLogo] = React.useState(false)

  React.useEffect(() => {
    if (companyInfo) {
      setEmail(companyInfo.email ?? "")
      setAddress(companyInfo.address ?? "")
      setPhone(companyInfo.phone ?? "")
      setShortDescription(companyInfo.shortDescription ?? "")
      setWorkingHours(companyInfo.workingHours ?? "")
      setRemovedExistingLogo(false)
      setRemovedExistingFooterLogo(false)
    }
  }, [companyInfo])

  const isSaving = createMutation.isPending || updateMutation.isPending
  const isEdit = !!companyInfo?.id

  const hasChanges = React.useMemo(() => {
    if (!isEdit || !companyInfo) return true

    const emailChanged = (companyInfo.email ?? "") !== email
    const addressChanged = (companyInfo.address ?? "") !== address
    const phoneChanged = (companyInfo.phone ?? "") !== phone
    const shortDescriptionChanged = (companyInfo.shortDescription ?? "") !== shortDescription
    const workingHoursChanged = (companyInfo.workingHours ?? "") !== workingHours
    const logoChanged = removedExistingLogo || imageFiles.length > 0
    const footerLogoChanged = removedExistingFooterLogo || footerLogoFiles.length > 0

    return (
      emailChanged ||
      addressChanged ||
      phoneChanged ||
      shortDescriptionChanged ||
      workingHoursChanged ||
      logoChanged ||
      footerLogoChanged
    )
  }, [isEdit, companyInfo, email, address, phone, shortDescription, workingHours, imageFiles.length, footerLogoFiles.length, removedExistingLogo, removedExistingFooterLogo])

  const handleSave = async () => {
    const fd = new FormData()
    if (email) fd.append("email", email)
    if (address) fd.append("address", address)
    if (phone) fd.append("phone", phone)
    if (shortDescription) fd.append("shortDescription", shortDescription)
    if (workingHours) fd.append("workingHours", workingHours)

    if (imageFiles.length > 0) {
      fd.append("logo", imageFiles[0].file)
    } else if (removedExistingLogo) {
      fd.append("logo", "") 
    }

    if (footerLogoFiles.length > 0) {
      fd.append("footerLogo", footerLogoFiles[0].file)
    } else if (removedExistingFooterLogo) {
      fd.append("footerLogo", "")
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
    return <WebFormSkeleton fields={4} hasBanner={true} />
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 bg-background rounded-xl shadow-sm border border-slate-200">
      <div className="space-y-1">
        <h2 className="lg:text-2xl font-bold text-slate-900">Company Information</h2>
        <p className="text-sm text-slate-500">Manage your site's basic details and branding.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4 md:col-span-2">
          <label className="block text-sm font-medium text-slate-700">
            Company Logo
          </label>
          <CustomFileUpload 
            maxFiles={1} 
            onFilesChange={(files) => setImageFiles(files)} 
            description="Upload your company logo (PNG, JPG, JPEG, or WEBP)"
          />
          {companyInfo?.logo && imageFiles.length === 0 && !removedExistingLogo && (
            <div className="mt-3 relative inline-block">
              <img 
                src={companyInfo.logo} 
                alt="Logo preview" 
                className="h-24 w-auto object-contain rounded-lg border border-slate-200 p-2" 
              />
              <button
                type="button"
                className="absolute -top-2 -right-2 bg-white text-slate-500 p-1 rounded-full shadow-md border border-slate-100 hover:text-destructive transition-colors"
                onClick={() => setRemovedExistingLogo(true)}
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>

        <div className="space-y-4 md:col-span-2">
          <label className="block text-sm font-medium text-slate-700">
            Footer Logo
          </label>
          <CustomFileUpload 
            maxFiles={1} 
            onFilesChange={(files) => setFooterLogoFiles(files)} 
            description="Upload your footer logo (PNG, JPG, JPEG, or WEBP)"
          />
          {companyInfo?.footerLogo && footerLogoFiles.length === 0 && !removedExistingFooterLogo && (
            <div className="mt-3 relative inline-block">
              <img 
                src={companyInfo.footerLogo} 
                alt="Footer Logo preview" 
                className="h-24 w-auto object-contain rounded-lg border border-slate-200 p-2" 
              />
              <button
                type="button"
                className="absolute -top-2 -right-2 bg-white text-slate-500 p-1 rounded-full shadow-md border border-slate-100 hover:text-destructive transition-colors"
                onClick={() => setRemovedExistingFooterLogo(true)}
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>

        <CustomInput
          label="Email Address"
          placeholder="e.g. contact@company.com"
          value={email}
          onValueChange={(v) => setEmail(v as string)}
          type="email"
        />

        <CustomInput
          label="Phone Number"
          placeholder="e.g. +1 (555) 000-0000"
          value={phone}
          onValueChange={(v) => setPhone(v as string)}
        />

        <div className="md:col-span-2">
          <CustomInput
            label="Address"
            placeholder="Full company address"
            value={address}
            onValueChange={(v) => setAddress(v as string)}
          />
        </div>

        <div className="md:col-span-2">
          <CustomInput
            label="Working Hours"
            placeholder="e.g. Mon - Fri: 9:00 AM - 6:00 PM"
            value={workingHours}
            onValueChange={(v) => setWorkingHours(v as string)}
          />
        </div>

        <div className="md:col-span-2">
          <CustomTextArea
            label="Short Description"
            placeholder="A brief overview of your company..."
            value={shortDescription}
            onValueChange={(v) => setShortDescription(v as string)}
            rows={4}
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
          {companyInfo?.id ? "Update Information" : "Save Information"}
        </CustomButton>
      </div>
    </div>
  )
}

export default CreateCompanyInformation
