import React from "react";
// Control typing from react-hook-form is intentionally relaxed to avoid
// generic variance errors when the parent form uses a specific field type.
// The form `control` is still used at runtime and validated by react-hook-form.

import { BiBarcodeReader } from "react-icons/bi";
import CustomInput from "../../FormFields/CustomInput";
import CustomSelect from "../../FormFields/CustomSelect";
import CustomDatePicker from "../../FormFields/CustomDatePicker";
import { Label } from "@/components/ui/label";

interface Option {
  label: string;
  value: string;
}

interface GeneralInformationProps {
  basePrice: number | null;
  setBasePrice: (value: number | null) => void;
  posPrice: number | null;
  setPosPrice: (value: number | null) => void;
  barcode: string;
  setBarcode: (value: string) => void;
  barcodeError?: string;
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
  // allow any to avoid cross-file react-hook-form generic incompatibilities
  control: any;
  discountOptions: Option[];
  stockStatusOptions: Option[];
  productStatusOptions: Option[];
  /** When false (create mode), Stock Status is hidden — the server always forces OUT_OF_STOCK on create */
  isEditMode?: boolean;
}

const GeneralInformation: React.FC<GeneralInformationProps> = ({
  basePrice,
  setBasePrice,
  posPrice,
  setPosPrice,
  barcode,
  setBarcode,
  barcodeError,
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
  isEditMode = false,
}) => {
  const barcodeInputRef = React.useRef<HTMLInputElement>(null);
  const barcodeBlurTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
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
        <CustomInput
          label="POS Price"
          type="number"
          value={posPrice === null ? "" : posPrice}
          onValueChange={(value) => setPosPrice(value as number | null)}
          placeholder="Optional"
          min={1}
        />
        {/* Barcode field — accepts manual input and physical barcode scanners */}
        <div className="space-y-2">
          <Label htmlFor="barcode-input">
            Barcode
          </Label>
          <div className="relative">
            <input
              id="barcode-input"
              ref={barcodeInputRef}
              type="text"
              inputMode="numeric"
              pattern="\d*"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              onBlur={() => {
                barcodeBlurTimerRef.current = setTimeout(() => {
                  if (
                    document.activeElement === document.body ||
                    document.activeElement === null
                  ) {
                    barcodeInputRef.current?.focus();
                  }
                }, 0);
              }}
              onFocus={() => {
                if (barcodeBlurTimerRef.current !== null) {
                  clearTimeout(barcodeBlurTimerRef.current);
                  barcodeBlurTimerRef.current = null;
                }
              }}
              placeholder="Digits only (e.g. 1234567890)"
              className={`flex h-9 w-full rounded-md border bg-transparent px-3 py-1 pr-9 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${barcodeError ? "border-destructive focus-visible:ring-destructive" : "border-input"}`}
              autoComplete="off"
              aria-invalid={!!barcodeError}
              aria-describedby={barcodeError ? "barcode-error" : undefined}
            />
            <BiBarcodeReader
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
              aria-hidden="true"
            />
          </div>
          {barcodeError && (
            <p id="barcode-error" className="text-xs text-destructive">
              {barcodeError}
            </p>
          )}
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
        <div className="space-y-1">
          <CustomInput
            label="Default Quantity (Target)"
            type="number"
            value={stockQuantity === null ? "" : stockQuantity}
            onValueChange={(value) => setStockQuantity(value as number | null)}
            requiredMark
            placeholder="0"
            min={0}
          />
          {!isEditMode && (
            <p className="text-xs text-slate-400">
              This is the target quantity. Actual stock is set to 0 until stocked via GRN.
            </p>
          )}
        </div>
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
        {isEditMode ? (
          <CustomSelect
            name="stockStatus"
            control={control}
            label="Stock Status"
            requiredMark
            options={stockStatusOptions}
          />
        ) : (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Stock Status
            </label>
            <div className="flex h-9 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500">
              Out of Stock <span className="ml-2 text-xs text-slate-400">(set automatically via GRN)</span>
            </div>
          </div>
        )}
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
