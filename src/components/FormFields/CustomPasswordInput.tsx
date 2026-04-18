import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";

type CustomPasswordInputProps =
  Omit<React.ComponentProps<typeof Input>, "type" | "onChange"> & {
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
      value: string | null,
      event: React.ChangeEvent<HTMLInputElement>
    ) => void;
  };

const CustomPasswordInput = ({
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
  onChange,
  onValueChange,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  ...props
}: CustomPasswordInputProps) => {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;

  const helperId = helperText ? `${inputId}-helper` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [helperId, errorId, ariaDescribedBy]
    .filter(Boolean)
    .join(" ");
  const hasError =
    Boolean(error) || ariaInvalid === true || ariaInvalid === "true";

  const [visible, setVisible] = React.useState(false);

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    onChange?.(event);

    if (!onValueChange) return;

    const value = event.target.value;
    onValueChange(value === "" ? null : value, event);
  };

  return (
    <div className={cn("space-y-2", containerClassName)}>
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

      <div className="relative">
        <Input
          id={inputId}
          type={visible ? "text" : "password"}
          className={cn(className, "pr-10")}
          aria-describedby={describedBy || undefined}
          aria-invalid={hasError || undefined}
          onChange={handleChange}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute hover:cursor-pointer inset-y-0 right-0 pr-2 flex items-center text-muted-foreground"
        >
          {visible ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
        </button>
      </div>

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

export default CustomPasswordInput;