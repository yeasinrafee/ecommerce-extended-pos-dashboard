"use client";

import * as React from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface CustomTextAreaProps extends React.ComponentProps<typeof Textarea> {
  label?: React.ReactNode;
  helperText?: React.ReactNode;
  error?: React.ReactNode;
  containerClassName?: string;
  labelClassName?: string;
  helperTextClassName?: string;
  errorClassName?: string;
  requiredMark?: boolean;
  onValueChange?: (
    value: string | null,
    event: React.ChangeEvent<HTMLTextAreaElement>
  ) => void;
}

const CustomTextArea = ({
  id,
  label,
  helperText,
  error,
  containerClassName,
  labelClassName,
  helperTextClassName,
  errorClassName,
  requiredMark = false,
  className,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  onChange,
  onValueChange,
  ...props
}: CustomTextAreaProps) => {
  const generatedId = React.useId();
  const textAreaId = id ?? generatedId;

  const helperId = helperText ? `${textAreaId}-helper` : undefined;
  const errorId = error ? `${textAreaId}-error` : undefined;
  const describedBy = [helperId, errorId, ariaDescribedBy]
    .filter(Boolean)
    .join(" ");
  const hasError =
    Boolean(error) || ariaInvalid === true || ariaInvalid === "true";

  return (
    <div className={cn("space-y-2", containerClassName)}>
      {label ? (
        <Label htmlFor={textAreaId} className={labelClassName}>
          {label}
          {requiredMark ? (
            <span className="ml-1 text-destructive" aria-hidden="true">
              *
            </span>
          ) : null}
        </Label>
      ) : null}

      <Textarea
        id={textAreaId}
        className={className}
        aria-describedby={describedBy || undefined}
        aria-invalid={hasError || undefined}
        onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => {
          onChange?.(event as any);
          onValueChange?.(event.target.value ?? null, event);
        }}
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

export default CustomTextArea;