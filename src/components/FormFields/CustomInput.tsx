"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type SupportedInputType = React.HTMLInputTypeAttribute | "float";
type CustomInputValue = string | number | null;

interface CustomInputProps
  extends Omit<React.ComponentProps<typeof Input>, "type" | "onChange"> {
  type?: SupportedInputType;
  label?: React.ReactNode;
  helperText?: React.ReactNode;
  error?: React.ReactNode;
  containerClassName?: string;
  labelClassName?: string;
  helperTextClassName?: string;
  errorClassName?: string;
  requiredMark?: boolean;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  onValueChange?: (
    value: CustomInputValue,
    event: React.ChangeEvent<HTMLInputElement>
  ) => void;
}

const CustomInput = ({
  id,
  type = "text",
  step,
  label,
  helperText,
  error,
  containerClassName,
  labelClassName,
  helperTextClassName,
  errorClassName,
  requiredMark = false,
  className,
  onChange,
  onValueChange,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  ...props
}: CustomInputProps) => {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;

  const resolvedType = type === "float" ? "number" : type;
  const resolvedStep = type === "float" ? step ?? "any" : step;

  const helperId = helperText ? `${inputId}-helper` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [helperId, errorId, ariaDescribedBy]
    .filter(Boolean)
    .join(" ");
  const hasError =
    Boolean(error) || ariaInvalid === true || ariaInvalid === "true";

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    onChange?.(event);

    if (!onValueChange) return;

    if (resolvedType === "number") {
      const rawValue = event.target.value.trim();

      if (!rawValue) {
        onValueChange(null, event);
        return;
      }

      const numericValue = Number(rawValue);
      onValueChange(Number.isNaN(numericValue) ? null : numericValue, event);
      return;
    }

    onValueChange(event.target.value, event);
  };

  return (
    <div className={cn("space-y-1.5", containerClassName)}>
      {label ? (
        <Label htmlFor={inputId} className={labelClassName}>
          {label}
          {requiredMark ? (
            <span className="ml-1 text-destructive" aria-hidden="true">
              *
            </span>
          ) : null}
        </Label>
      ) : null}

      <Input
        id={inputId}
        type={resolvedType}
        step={resolvedStep}
        className={cn("h-10", className)}
        aria-describedby={describedBy || undefined}
        aria-invalid={hasError || undefined}
        onChange={handleChange}
        {...props}
      />

      {helperText ? (
        <p
          id={helperId}
          className={cn("text-xs text-muted-foreground", helperTextClassName)}
        >
          {helperText}
        </p>
      ) : null}

      {error ? (
        <p id={errorId} className={cn("text-xs text-destructive", errorClassName)}>
          {error}
        </p>
      ) : null}
    </div>
  );
};

export default CustomInput;