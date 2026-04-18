import React, {
  useState,
  useRef,
  useEffect,
  KeyboardEvent,
  ClipboardEvent,
} from "react";
import clsx from "clsx";

interface OtpInputProps {
  length?: number;
  value?: string;
  onChange?: (value: string) => void;
  label?: React.ReactNode;
  helperText?: React.ReactNode;
  error?: React.ReactNode;
  className?: string;
  inputWrapperClassName?: string;
  slotClassName?: string;
  slotActiveClassName?: string;
  errorClassName?: string;
  helperClassName?: string;
  // expiry can be an ISO string, timestamp (ms) or Date
  expiry?: string | number | Date | null;
  timerDuration?: number; // fallback duration in seconds
  onExpire?: () => void;
  onResend?: () => void;
}

const DEFAULT_LENGTH = 6;

const OtpInput = React.forwardRef<HTMLDivElement, OtpInputProps>(
  (props, ref) => {
    const {
      length = DEFAULT_LENGTH,
      label,
      helperText,
      error,
      className,
      inputWrapperClassName,
      slotClassName,
      slotActiveClassName,
      errorClassName,
      helperClassName,
      value = "",
      onChange,
      expiry = null,
      timerDuration = 180, // Default 3 minutes fallback
      onExpire,
      onResend,
    } = props;

    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const computeInitial = () => {
      if (expiry) {
        const end =
          typeof expiry === "number" ? expiry : new Date(expiry).getTime();
        return Math.max(0, Math.floor((end - Date.now()) / 1000));
      }
      return timerDuration;
    };
    const [timeLeft, setTimeLeft] = useState<number>(computeInitial);

    // Keep a single interval and derive seconds from `expiry` (or fallback end time)
    useEffect(() => {
      let mounted = true;
      const end = expiry
        ? typeof expiry === "number"
          ? expiry
          : new Date(expiry).getTime()
        : Date.now() + timerDuration * 1000;

      const tick = () => {
        const secs = Math.max(0, Math.floor((end - Date.now()) / 1000));
        if (!mounted) return;
        setTimeLeft(secs);
        if (secs <= 0 && onExpire) {
          try {
            onExpire();
          } catch (e) {}
        }
      };

      tick();
      const iv = setInterval(tick, 1000);
      return () => {
        mounted = false;
        clearInterval(iv);
      };
    }, [expiry, timerDuration, onExpire]);

    const formatTime = (seconds: number) => {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    };

    const handleResend = () => {
      setTimeLeft(timerDuration);
      if (onResend) onResend();
    };

    const handleChange = (
      e: React.ChangeEvent<HTMLInputElement>,
      index: number,
    ) => {
      const val = e.target.value;
      if (!/^[0-9]*$/.test(val)) return; // Only allow digits

      const newValue = value.split("");
      // Take the last character in case they type fast it adds to the current value
      newValue[index] = val.substring(val.length - 1);
      const finalValue = newValue.join("").slice(0, length);

      if (onChange) onChange(finalValue);

      // Focus next on input
      if (val && index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    };

    const handleKeyDown = (
      e: KeyboardEvent<HTMLInputElement>,
      index: number,
    ) => {
      if (e.key === "Backspace") {
        e.preventDefault();
        const newValue = value.split("");

        if (newValue[index]) {
          // Clear current input
          newValue[index] = "";
          if (onChange) onChange(newValue.join(""));
        } else if (index > 0) {
          // Move to prev and clear it
          newValue[index - 1] = "";
          if (onChange) onChange(newValue.join(""));
          inputRefs.current[index - 1]?.focus();
        }
      } else if (e.key === "ArrowLeft" && index > 0) {
        e.preventDefault();
        inputRefs.current[index - 1]?.focus();
      } else if (e.key === "ArrowRight" && index < length - 1) {
        e.preventDefault();
        inputRefs.current[index + 1]?.focus();
      }
    };

    const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pastedData = e.clipboardData
        .getData("text/plain")
        .replace(/[^0-9]/g, "")
        .slice(0, length);
      if (onChange) onChange(pastedData);

      // Focus the next empty input or the last one
      const nextIndex = Math.min(pastedData.length, length - 1);
      inputRefs.current[nextIndex]?.focus();
    };

    // Ensure refs array is strictly sized to length
    useEffect(() => {
      inputRefs.current = inputRefs.current.slice(0, length);
    }, [length]);

    return (
      <div ref={ref} className={clsx("flex flex-col gap-4", className)}>
        <div className="flex flex-col gap-2 relative z-10">
          {label ? (
            <span className="text-sm font-medium text-slate-700">{label}</span>
          ) : null}

          <div className="flex flex-col items-center mt-4 space-y-3">
            <div className="text-center">
              <span
                className={clsx(
                  "text-4xl font-black py-2 px-6 rounded-2xl tracking-widest inline-block shadow-sm border-2",
                  timeLeft <= 30
                    ? "text-rose-600 bg-rose-50 border-rose-100 animate-pulse"
                    : "text-slate-700 bg-slate-50 border-slate-100",
                )}
              >
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>

          <div
            className={clsx(
              "flex w-full gap-3 justify-center py-4",
              inputWrapperClassName,
            )}
          >
            {Array.from({ length }).map((_, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputRefs.current[i] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={value[i] || ""}
                onChange={(e) => handleChange(e, i)}
                onKeyDown={(e) => handleKeyDown(e, i)}
                onPaste={handlePaste}
                onFocus={(e) => e.target.select()}
                className={clsx(
                  "w-14 h-16 text-center text-2xl font-bold bg-white border-2 rounded-xl transition-all duration-200 outline-none",
                  "focus:border-brand-primary focus:-translate-y-1",
                  value[i]
                    ? "border-brand-primary text-black bg-brand-primary-50/30"
                    : "border-slate-200 text-slate-900",
                  slotClassName,
                )}
              />
            ))}
          </div>

          {error ? (
            <p
              className={clsx(
                "text-sm text-center font-medium mt-2 text-rose-500",
                errorClassName,
              )}
            >
              {error}
            </p>
          ) : helperText ? (
            <p
              className={clsx(
                "text-sm text-center mt-2 text-slate-500",
                helperClassName,
              )}
            >
              {helperText}
            </p>
          ) : null}
        </div>
      </div>
    );
  },
);

OtpInput.displayName = "OtpInput";

export default OtpInput;
