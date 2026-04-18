"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export type CustomButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
 
  variant?: "primary" | "secondary" | "outline" | "ghost" | "link"
  size?: "sm" | "md" | "lg"
  loading?: boolean
  className?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const baseStyles =
  "inline-flex items-center justify-center rounded transition-colors cursor-pointer"

const variantClasses: Record<NonNullable<CustomButtonProps["variant"]>, string> = {
  primary:
    "bg-brand-primary text-white hover:bg-brand-primary-dark focus:ring-brand-primary",
  secondary:
    "bg-secondary text-white hover:bg-secondary-dark focus:ring-secondary",
  outline: "border border-current bg-transparent hover:bg-accent",
  ghost: "bg-transparent hover:bg-accent",
  link: "bg-transparent underline p-0 hover:opacity-70",
}

const sizeClasses: Record<NonNullable<CustomButtonProps["size"]>, string> = {
  sm: "px-3 py-1 text-sm",
  md: "px-4 py-2 text-base",
  lg: "px-6 py-3 text-lg",
}

const spinner = (
  <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
)

const CustomButton = React.forwardRef<HTMLButtonElement, CustomButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      disabled = false,
      className,
      leftIcon,
      rightIcon,
      children,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading
    const disabledVariantClasses =
      "bg-slate-300 text-slate-500 hover:bg-slate-300 focus:ring-slate-300 cursor-not-allowed"
    const computedVariantClasses = isDisabled ? disabledVariantClasses : variantClasses[variant]

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          baseStyles,
          computedVariantClasses,
          sizeClasses[size],
          isDisabled && "opacity-70",
          className,
        )}
        {...props}
      >
        {loading && spinner}
        {leftIcon && <span className="mr-2">{leftIcon}</span>}
        {children}
        {rightIcon && <span className="ml-2">{rightIcon}</span>}
      </button>
    )
  },
)

CustomButton.displayName = "CustomButton"

export default CustomButton
