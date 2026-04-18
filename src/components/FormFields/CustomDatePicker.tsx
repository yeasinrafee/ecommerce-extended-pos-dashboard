"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { FiCalendar } from "react-icons/fi"

export type CustomDatePickerProps = {
  id?: string
  value?: Date | null
  defaultValue?: Date | null
  onChange?: (date: Date | null) => void
  label?: string
  placeholder?: string
  format?: (date: Date | null) => string
  disabled?: boolean
  required?: boolean
  requiredMark?: boolean
  // class overrides
  className?: string
  fieldClassName?: string
  labelClassName?: string
  buttonClassName?: string
  popoverClassName?: string
  calendarClassName?: string
  dayClassName?: string
  todayClassName?: string
  selectedDayClassName?: string
  clearButtonClassName?: string
  // open control
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  // date bounds
  min?: Date
  max?: Date
  // misc
  size?: "sm" | "md" | "lg"
  // passthroughs
  buttonProps?: React.ButtonHTMLAttributes<HTMLButtonElement>
}

function isSameDay(a?: Date | null, b?: Date | null) {
  if (!a || !b) return false
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1)
}

function getGridDates(monthDate: Date) {
  const start = startOfMonth(monthDate)
  const end = endOfMonth(monthDate)
  const startPadding = start.getDay() // 0..6 (Sun..Sat)
  const totalDays = startPadding + end.getDate()
  const totalWeeks = Math.ceil(totalDays / 7)
  const gridStart = new Date(start)
  gridStart.setDate(start.getDate() - startPadding)
  const days: Date[] = []
  for (let i = 0; i < totalWeeks * 7; i++) {
    const d = new Date(gridStart)
    d.setDate(gridStart.getDate() + i)
    days.push(d)
  }
  const weeks: Date[][] = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }
  return weeks
}

const defaultFormat = (d: Date | null) => (d ? d.toLocaleDateString() : "")

const CustomDatePicker = React.forwardRef<HTMLButtonElement, CustomDatePickerProps>(
  (
    {
      id,
      value,
      defaultValue,
      onChange,
      label,
      placeholder = "Select date",
      format = defaultFormat,
      disabled,
      required,
      requiredMark = false,
      className,
      fieldClassName,
      labelClassName,
      buttonClassName,
      popoverClassName,
      calendarClassName,
      dayClassName,
      todayClassName,
      selectedDayClassName,
      clearButtonClassName,
      open: openProp,
      defaultOpen,
      onOpenChange,
      min,
      max,
      size = "md",
      buttonProps,
    },
    ref,
  ) => {
    const isControlled = value !== undefined
    const [selected, setSelected] = React.useState<Date | null>(isControlled ? (value as Date | null) : defaultValue ?? null)

    React.useEffect(() => {
      if (isControlled) setSelected(value as Date | null)
    }, [value, isControlled])

    const isOpenControlled = openProp !== undefined
    const [openInternal, setOpenInternal] = React.useState<boolean>(defaultOpen ?? false)
    const open = isOpenControlled ? !!openProp : openInternal

    React.useEffect(() => {
      if (isOpenControlled && onOpenChange) onOpenChange(!!openProp)
    }, [])

    const setOpen = (v: boolean) => {
      if (isOpenControlled) {
        onOpenChange?.(v)
      } else {
        setOpenInternal(v)
      }
    }

    const [month, setMonth] = React.useState<Date>(() => (selected ? startOfMonth(selected) : startOfMonth(new Date())))

    React.useEffect(() => {
      if (selected) setMonth(startOfMonth(selected))
    }, [selected])

    const popoverRef = React.useRef<HTMLDivElement | null>(null)

    React.useEffect(() => {
      function onDoc(e: MouseEvent) {
        const target = e.target as Node | null
        if (!popoverRef.current) return
        if (!popoverRef.current.contains(target) && open) {
          setOpen(false)
        }
      }
      document.addEventListener("mousedown", onDoc)
      return () => document.removeEventListener("mousedown", onDoc)
    }, [open])

    React.useEffect(() => {
      function onKey(e: KeyboardEvent) {
        if (e.key === "Escape" && open) setOpen(false)
      }
      document.addEventListener("keydown", onKey)
      return () => document.removeEventListener("keydown", onKey)
    }, [open])

    const handleSelect = (d: Date) => {
      if (min && d < min) return
      if (max && d > max) return
      if (!isControlled) setSelected(d)
      onChange?.(d)
      setOpen(false)
    }

    const handleClear = () => {
      if (!isControlled) setSelected(null)
      onChange?.(null)
      setOpen(false)
    }

    const weeks = React.useMemo(() => getGridDates(month), [month])

    return (
      <div className={cn("inline-block w-full", fieldClassName, className)}>
        {label ? (
              <Label htmlFor={id} className={cn("mb-2", labelClassName)}>
                {label}
                {requiredMark ? (
                  <span className="ml-1 text-destructive" aria-hidden="true">*</span>
                ) : null}
              </Label>
            ) : null}

        <div className="relative inline-block w-full">
          <Button
            id={id}
            ref={ref}
            type={buttonProps?.type ?? "button"}
            variant={size === "md" ? "outline" : "default"}
            className={cn("justify-between font-normal w-full", buttonClassName)}
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            disabled={disabled}
            {...buttonProps}
          >
            <span className={cn("truncate")}>{selected ? format(selected) : placeholder}</span>
            <FiCalendar className="ml-2 h-4 w-4 text-muted-foreground" />
          </Button>

          {open ? (
            <div
              ref={popoverRef}
              role="dialog"
              aria-modal="false"
              className={cn(
                "absolute left-0 mt-2 z-50 w-72 min-w-[220px] rounded-md bg-popover text-popover-foreground shadow-lg",
                popoverClassName,
              )}
            >
              <div className={cn("p-2", calendarClassName)}>
                <div className="flex items-center justify-between px-2 py-1">
                  <button
                    type="button"
                    onClick={() => setMonth((m) => addMonths(m, -1))}
                    className="inline-flex items-center justify-center rounded p-1 hover:bg-accent/50"
                    aria-label="Previous month"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <div className="text-sm font-medium">
                    {month.toLocaleString(undefined, { month: "long" })} {month.getFullYear()}
                  </div>
                  <button
                    type="button"
                    onClick={() => setMonth((m) => addMonths(m, 1))}
                    className="inline-flex items-center justify-center rounded p-1 hover:bg-accent/50"
                    aria-label="Next month"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                <div className="mt-2 grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
                  {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
                    <div key={d} className="py-1 font-medium">
                      {d}
                    </div>
                  ))}
                </div>

                <div className="mt-1 grid grid-cols-7 gap-1">
                  {weeks.map((week, wi) => (
                    <React.Fragment key={wi}>
                      {week.map((day) => {
                        const isCurrentMonth = day.getMonth() === month.getMonth()
                        const isToday = isSameDay(day, new Date())
                        const isSelected = isSameDay(day, selected ?? null)
                        const disabledDay = (min && day < min) || (max && day > max)

                        return (
                          <button
                            key={day.toISOString()}
                            type="button"
                            onClick={() => !disabledDay && handleSelect(day)}
                            className={cn(
                              "flex h-8 w-8 items-center justify-center rounded text-sm",
                              dayClassName,
                              !isCurrentMonth && "text-muted-foreground",
                              isToday && todayClassName ? todayClassName : isToday && "ring-1 ring-ring",
                              isSelected && selectedDayClassName ? selectedDayClassName : isSelected && "bg-primary text-primary-foreground",
                              disabledDay && "opacity-40 pointer-events-none",
                            )}
                            aria-pressed={isSelected}
                          >
                            {day.getDate()}
                          </button>
                        )
                      })}
                    </React.Fragment>
                  ))}
                </div>

                <div className="mt-3 flex items-center justify-between px-2">
                  <button
                    type="button"
                    onClick={handleClear}
                    className={cn("inline-flex items-center gap-2 rounded px-2 py-1 text-sm", clearButtonClassName)}
                  >
                    <X size={14} />
                    Clear
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="rounded px-2 py-1 text-sm hover:bg-accent/50"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    )
  },
)

CustomDatePicker.displayName = "CustomDatePicker"

export default CustomDatePicker
