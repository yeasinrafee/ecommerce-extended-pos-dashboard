"use client";

import * as React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface CustomCheckboxProps extends React.ComponentProps<typeof Checkbox> {
  label?: React.ReactNode;
  description?: React.ReactNode;
  containerClassName?: string;
  labelClassName?: string;
  descriptionClassName?: string;
  requiredMark?: boolean;
}

const CustomCheckbox = ({
  id,
  label,
  description,
  containerClassName,
  labelClassName,
  descriptionClassName,
  requiredMark = false,
  className,
  ...props
}: CustomCheckboxProps) => {
  const generatedId = React.useId();
  const checkboxId = id ?? generatedId;

  return (
    <div className={cn("flex items-start gap-3", containerClassName)}>
      <Checkbox id={checkboxId} className={className} {...props} />

      {label || description ? (
        <div className="space-y-1 leading-none">
          {label ? (
            <Label
              htmlFor={checkboxId}
              className={cn("cursor-pointer text-sm font-medium", labelClassName)}
            >
              {label}
              {requiredMark ? (
                <span className="ml-1 text-destructive" aria-hidden="true">*</span>
              ) : null}
            </Label>
          ) : null}

          {description ? (
            <p
              className={cn(
                "text-xs text-muted-foreground",
                descriptionClassName
              )}
            >
              {description}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default CustomCheckbox;