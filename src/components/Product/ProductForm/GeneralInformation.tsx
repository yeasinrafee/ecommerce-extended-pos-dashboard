import React from "react";
import { Control } from "react-hook-form";

import CustomInput from "../../FormFields/CustomInput";
import CustomSelect from "../../FormFields/CustomSelect";
import CustomDatePicker from "../../FormFields/CustomDatePicker";

interface Option {
  label: string;
  value: string;
}

interface GeneralInformationProps {
  basePrice: number | null;
  setBasePrice: (value: number | null) => void;
  selectedDiscountType: string;
  discountValue: number | null;
  setDiscountValue: (value: number | null) => void;
  discountStart: Date | null;
  setDiscountStart: (value: Date | null) => void;
  discountEnd: Date | null;
  setDiscountEnd: (value: Date | null) => void;
  stockQuantity: number | null;
  setStockQuantity: (value: number | null) => void;
  sku: string;
  setSku: (value: string) => void;
  weight: number | null;
  setWeight: (value: number | null) => void;
  lengthCm: number | null;
  setLengthCm: (value: number | null) => void;
  widthCm: number | null;
  setWidthCm: (value: number | null) => void;
  heightCm: number | null;
  setHeightCm: (value: number | null) => void;
  control: Control<any>;
  discountOptions: Option[];
  stockStatusOptions: Option[];
  productStatusOptions: Option[];
}

const GeneralInformation: React.FC<GeneralInformationProps> = ({
  basePrice,
  setBasePrice,
  selectedDiscountType,
  discountValue,
  setDiscountValue,
  discountStart,
  setDiscountStart,
  discountEnd,
  setDiscountEnd,
  stockQuantity,
  setStockQuantity,
  sku,
  setSku,
  weight,
  setWeight,
  lengthCm,
  setLengthCm,
  widthCm,
  setWidthCm,
  heightCm,
  setHeightCm,
  control,
  discountOptions,
  stockStatusOptions,
  productStatusOptions,
}) => {
  const finalPrice = React.useMemo(() => {
    if (basePrice == null) return "";
    const disc = discountValue ?? 0;
    switch (selectedDiscountType) {
      case "FLAT_DISCOUNT":
        return Math.max(0, basePrice - disc);
      case "PERCENTAGE_DISCOUNT":
        return Math.max(0, basePrice - basePrice * (disc / 100));
      default:
        return basePrice;
    }
  }, [basePrice, selectedDiscountType, discountValue]);
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <CustomInput
          label="Base Price"
          type="number"
          value={basePrice === null ? "" : basePrice}
          onValueChange={(value) => setBasePrice(value as number | null)}
          requiredMark
          placeholder="0.00"
        />
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Final Price
          </label>
          <CustomInput
            type="number"
            value={finalPrice === "" ? "" : finalPrice}
            disabled
            className="mt-1"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <CustomSelect
          name="discountType"
          control={control}
          label="Discount Type"
          options={discountOptions}
        />
          <CustomInput
            label="Discount Value"
            type="number"
            value={discountValue === null ? "" : discountValue}
            onValueChange={(value) => setDiscountValue(value as number | null)}
            placeholder="0"
            min={0}
            disabled={selectedDiscountType === "NONE"}
          />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <CustomDatePicker
          label="Discount Start Date"
          value={discountStart}
          onChange={setDiscountStart}
          disabled={selectedDiscountType === "NONE"}
        />
        <CustomDatePicker
          label="Discount End Date"
          value={discountEnd}
          onChange={setDiscountEnd}
          disabled={selectedDiscountType === "NONE"}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <CustomInput
          label="Stock Quantity"
          type="number"
          value={stockQuantity === null ? "" : stockQuantity}
          onValueChange={(value) => setStockQuantity(value as number | null)}
          requiredMark
          placeholder="0"
          min={0}
        />
        <CustomInput
          label="SKU"
          value={sku}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
            setSku(event.target.value)
          }
        />
      </div>

      <div className="">
        <p className="my-2 text-xs text-slate-500">
          Either provide weight or all three dimensions (Length, Width, Height).
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <CustomInput
            label="Weight (grams/Ml)"
            type="number"
            value={weight === null ? "" : weight}
            onValueChange={(value) => setWeight(value as number | null)}
            placeholder="0"
            min={0}
            requiredMark
          />

          <div>
            <div className="mt-1 grid grid-cols-3 gap-2">
              <CustomInput
                label="Length"
                type="number"
                value={lengthCm === null ? "" : lengthCm}
                onValueChange={(value) => setLengthCm(value as number | null)}
                placeholder="0"
                min={0}
                requiredMark
              />
              <CustomInput
                label="Width"
                type="number"
                value={widthCm === null ? "" : widthCm}
                onValueChange={(value) => setWidthCm(value as number | null)}
                placeholder="0"
                min={0}
                requiredMark
              />
              <CustomInput
                label="Height"
                type="number"
                value={heightCm === null ? "" : heightCm}
                onValueChange={(value) => setHeightCm(value as number | null)}
                placeholder="0"
                min={0}
                requiredMark
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <CustomSelect
          name="stockStatus"
          control={control}
          label="Stock Status"
          requiredMark
          options={stockStatusOptions}
        />
        <CustomSelect
          name="status"
          control={control}
          label="Product Status"
          requiredMark
          options={productStatusOptions}
        />
      </div>
    </div>
  );
};

export default GeneralInformation;
