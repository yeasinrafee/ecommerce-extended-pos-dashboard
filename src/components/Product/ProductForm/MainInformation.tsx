import React from "react";
import { Control } from "react-hook-form";

import CustomInput from "../../FormFields/CustomInput";
import CustomRichTextEditor from "../../Common/CustomRichTextEditor";
import CustomSelect from "../../FormFields/CustomSelect";
import CustomTextArea from "../../FormFields/CustomTextArea";

export interface BrandOption {
  label: string;
  value: string;
}

interface MainInformationProps {
  productName: string;
  setProductName: (value: string) => void;
  shortDescription: string;
  setShortDescription: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  brandOptions: BrandOption[];
  control: Control<any>;
  isEditMode?: boolean;
  onEditorProcessingChange?: (processing: boolean) => void;
}

const MainInformation: React.FC<MainInformationProps> = ({
  productName,
  setProductName,
  shortDescription,
  setShortDescription,
  description,
  setDescription,
  brandOptions,
  control,
  isEditMode = false,
  onEditorProcessingChange,
}) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-background px-6 py-6 shadow-sm">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-slate-900">{isEditMode ? 'Edit Product' : 'Create Product'}</h1>
        <p className="text-sm text-slate-500">
          Capture the primary details your team needs to launch the item.
        </p>
      </div>

      <div className="mt-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <CustomInput
            label="Product Name"
            value={productName}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setProductName(event.target.value)}
            requiredMark
          />
          <CustomSelect
            name="brand"
            control={control}
            label="Product Brand"
            options={brandOptions}
          />
        </div>

        <CustomTextArea
          label="Short Description"
          value={shortDescription}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setShortDescription(event.target.value)}
          className="min-h-35"
        />

        <div className="space-y-3">
          <div className="text-sm font-semibold text-slate-700">
            Description
            <span className="ml-1 text-destructive">*</span>
          </div>
          <CustomRichTextEditor value={description} onChange={setDescription} onProcessingChange={onEditorProcessingChange} />
        </div>
      </div>
    </div>
  );
};

export default MainInformation;