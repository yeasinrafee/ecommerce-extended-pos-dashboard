import React from "react";
import { LuLoaderCircle } from "react-icons/lu";
import { cn } from "@/lib/utils";

type SizeKey = "xs" | "sm" | "md" | "lg" | "xl";
const SIZE_MAP: Record<SizeKey, number> = {
  xs: 12,
  sm: 14,
  md: 18,
  lg: 24,
  xl: 32,
};

export interface LoaderProps {
  size?: SizeKey | number;
  className?: string;
  spinnerClassName?: string;
  color?: string;
  label?: React.ReactNode;
  labelPosition?: "right" | "left" | "top" | "bottom" | "hidden";
  variant?: "inline" | "center" | "overlay";
  fullScreen?: boolean;
  speed?: number;
  ariaLabel?: string;
  gap?: number;
  overlayBgClass?: string;
  style?: React.CSSProperties;
  iconProps?: React.SVGProps<SVGSVGElement>;
}

export default function Loader({
  size = "md",
  className,
  spinnerClassName,
  color,
  label,
  labelPosition = "right",
  variant = "inline",
  fullScreen = false,
  speed = 1,
  ariaLabel,
  gap = 8,
  overlayBgClass = "bg-black/40",
  style,
  iconProps,
}: LoaderProps) {
  const sizePx = typeof size === "number" ? size : SIZE_MAP[size];
  const spinStyle: React.CSSProperties = { animationDuration: `${Math.max(0.05, speed)}s` };
  const icon = (
    <LuLoaderCircle
      {...iconProps}
      size={sizePx}
      className={cn("motion-safe:animate-spin", spinnerClassName)}
      style={{ color, ...(iconProps?.style ?? {}), ...spinStyle }}
      aria-hidden
    />
  );

  const content = (
    <div
      role={ariaLabel ? "status" : "status"}
      aria-live="polite"
      aria-label={ariaLabel}
      className={cn(
        label && (labelPosition === "top" || labelPosition === "bottom")
          ? "flex flex-col items-center"
          : "inline-flex items-center",
        className,
      )}
      style={{ gap, ...style }}
    >
      {label && labelPosition === "left" ? <span className="text-sm">{label}</span> : null}
      {icon}
      {label && labelPosition === "right" ? <span className="text-sm">{label}</span> : null}
      {label && labelPosition === "top" ? <div className="mb-2 text-sm">{label}</div> : null}
      {label && labelPosition === "bottom" ? <div className="mt-2 text-sm">{label}</div> : null}
      {label && labelPosition === "hidden" ? <span className="sr-only">{label}</span> : null}
    </div>
  );

  if (fullScreen || variant === "overlay") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className={cn("absolute inset-0", overlayBgClass)} />
        <div className="relative z-10">{content}</div>
      </div>
    );
  }

  if (variant === "center") {
    return <div className="flex items-center justify-center w-full h-full">{content}</div>;
  }

  return <>{content}</>;
}

export { Loader };
