"use client";

import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

export type DateTimeInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  value?: string;
  onChange?: (value: string) => void;
  inputClassName?: string;
  containerClassName?: string;
  label?: string;
};

const DateTimeInput = forwardRef<HTMLInputElement, DateTimeInputProps>(
  ({ value, onChange, inputClassName, containerClassName, label, className, ...rest }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e.target.value);
      const nativeOnChange = (rest as any).onChange;
      if (nativeOnChange) nativeOnChange(e);
    };

    return (
      <div className={cn("inline-block w-full", containerClassName)}>
        {label ? <label className="block text-sm mb-1">{label}</label> : null}
        <input
          ref={ref}
          type="datetime-local"
          value={value ?? ""}
          onChange={handleChange}
          className={cn("w-full rounded-md border px-3 py-2 h-9", inputClassName, className)}
          {...rest}
        />
      </div>
    );
  },
);

DateTimeInput.displayName = "DateTimeInput";

export default DateTimeInput;
