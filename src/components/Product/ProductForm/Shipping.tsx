import React from "react";
import { Control } from "react-hook-form";

import CustomInput from "../../FormFields/CustomInput";
import CustomSelect from "../../FormFields/CustomSelect";

interface Option {
  label: string;
  value: string;
}

interface ShippingProps {
  shippingWeight: number | null;
  setShippingWeight: (value: number | null) => void;
  shippingLength: number | null;
  setShippingLength: (value: number | null) => void;
  shippingWidth: number | null;
  setShippingWidth: (value: number | null) => void;
  shippingHeight: number | null;
  setShippingHeight: (value: number | null) => void;
  control: Control<any>;
  shippingClassOptions: Option[];
}

const Shipping: React.FC<ShippingProps> = ({
  shippingWeight,
  setShippingWeight,
  shippingLength,
  setShippingLength,
  shippingWidth,
  setShippingWidth,
  shippingHeight,
  setShippingHeight,
  control,
  shippingClassOptions,
}) => {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <CustomSelect
          name="shippingClass"
          control={control}
          label="Shipping Class"
          options={shippingClassOptions}
        />
        <CustomInput
          label="Weight (kg)"
          type="number"
          value={shippingWeight === null ? "" : shippingWeight}
          onValueChange={(value) => setShippingWeight(value as number | null)}
          placeholder="0.0"
          min={0}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <CustomInput
          label="Length (cm)"
          type="number"
          value={shippingLength === null ? "" : shippingLength}
          onValueChange={(value) => setShippingLength(value as number | null)}
          placeholder="0"
          min={0}
        />
        <CustomInput
          label="Width (cm)"
          type="number"
          value={shippingWidth === null ? "" : shippingWidth}
          onValueChange={(value) => setShippingWidth(value as number | null)}
          placeholder="0"
          min={0}
        />
        <CustomInput
          label="Height (cm)"
          type="number"
          value={shippingHeight === null ? "" : shippingHeight}
          onValueChange={(value) => setShippingHeight(value as number | null)}
          placeholder="0"
          min={0}
        />
      </div>

      <p className="text-sm text-slate-500">
        Dimensions help calculate shipping costs and packaging guidelines.
      </p>
    </div>
  );
};

export default Shipping;