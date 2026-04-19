"use client";

import { Controller, Control, FieldValues, Path } from "react-hook-form";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SelectOption {
  label: string;
  value: string;
}

interface CustomSelectProps<
  TFieldValues extends FieldValues,
  TContext = any,
  TTransformedValues extends FieldValues | undefined = TFieldValues
> {
  name: Path<TFieldValues>;
  control: Control<TFieldValues, TContext, TTransformedValues>;
  label?: string;
  requiredMark?: boolean;
  placeholder?: string;
  description?: string;
  options: SelectOption[];
  fieldToValue?: (val: any) => string;
  valueToField?: (val: string) => any;
  disabled?: boolean;
  className?: string;
  fieldClassName?: string;
  labelClassName?: string;
  triggerClassName?: string;
  contentClassName?: string;
  itemClassName?: string;
  descriptionClassName?: string;
  errorClassName?: string;
  onChangeCallback?: (value: string) => void;
}

export default function CustomSelect<
  TFieldValues extends FieldValues,
  TContext = any,
  TTransformedValues extends FieldValues | undefined = TFieldValues
>({
  name,
  control,
  label,
  placeholder = "Select an option",
  description,
  options,
  requiredMark = false,
  fieldToValue,
  valueToField,
  disabled = false,
  className,
  fieldClassName,
  labelClassName,
  triggerClassName,
  contentClassName,
  itemClassName,
  descriptionClassName,
  errorClassName,
  onChangeCallback,
}: CustomSelectProps<TFieldValues, TContext, TTransformedValues>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        const selectValue = typeof fieldToValue === "function" ? fieldToValue(field.value) : field.value;

        return (
          <div data-invalid={fieldState.invalid} className={cn(fieldClassName)}>
            {label && (
              <Label htmlFor={`select-${String(name)}`} className={cn("mb-1.5", labelClassName)}>
                {label}
                {requiredMark ? (
                  <span className="ml-1 text-destructive" aria-hidden="true">*</span>
                ) : null}
              </Label>
            )}

            <Select
              onValueChange={(v: string) => {
                field.onChange(typeof valueToField === "function" ? valueToField(v) : v);
                if (onChangeCallback) onChangeCallback(v);
              }}
              value={selectValue}
              disabled={disabled}
            >
              <SelectTrigger id={`select-${String(name)}`} className={cn("h-10! w-full bg-white", triggerClassName)}>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
              <SelectContent position="popper" className={cn(contentClassName)}>
                {options.map((option) => (
                  <SelectItem key={option.value} value={option.value} className={cn(itemClassName)}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {description && (
              <p className={cn("text-xs text-muted-foreground", descriptionClassName)}>
                {description}
              </p>
            )}

            {fieldState.invalid && (
              <p className={cn("text-xs text-destructive", errorClassName)}>
                {fieldState.error?.message ?? "Invalid"}
              </p>
            )}
          </div>
        );
      }}
    />
  );
}