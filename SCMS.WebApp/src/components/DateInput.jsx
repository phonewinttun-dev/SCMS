import { useState, useRef, useEffect } from "react";
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Cross2Icon,
} from "@radix-ui/react-icons";
import { cn } from "../lib/utils";
import { formatDate } from "../utils/format";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const formatDisplayDate = (isoDate) => {
  if (!isoDate) return "";
  return formatDate(isoDate);
};

const pad2 = (n) => String(n).padStart(2, "0");

/**
 * Dedicated Accessible DateInput & Calendar Component matching Warm Pearl & Frosted Ambient Theme
 */
export default function DateInput({
  value = "",
  onChange,
  className = "",
  placeholder = "Select Date",
  min = "",
  max = "",
  disabled = false,
  required = false,
  id,
  name,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Parse initial view year and month from value or fallback to today
  const initialDate = value ? new Date(value) : new Date();
  const validInitial = isNaN(initialDate.getTime()) ? new Date() : initialDate;

  const [viewYear, setViewYear] = useState(validInitial.getFullYear());
  const [viewMonth, setViewMonth] = useState(validInitial.getMonth()); // 0-11
  const [viewMode, setViewMode] = useState("days"); // "days" | "months" | "years"

  // Sync view when value changes from outside
  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [value]);

  // Click outside to close
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setViewMode("days");
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
      document.addEventListener("touchstart", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [isOpen]);

  const notifyChange = (newIsoDate) => {
    if (disabled) return;
    if (onChange) {
      onChange({
        target: {
          value: newIsoDate,
          name: name || id,
        },
      });
    }
  };

  const handleSelectDay = (day) => {
    const isoStr = `${viewYear}-${pad2(viewMonth + 1)}-${pad2(day)}`;
    notifyChange(isoStr);
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    notifyChange("");
    setIsOpen(false);
  };

  const handleToday = () => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${pad2(today.getMonth() + 1)}-${pad2(today.getDate())}`;
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    notifyChange(todayStr);
    setIsOpen(false);
  };

  const prevMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Calendar calculations
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sun, 1 = Mon...
  const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

  // Current date markers
  const now = new Date();
  const isCurrentMonth = now.getFullYear() === viewYear && now.getMonth() === viewMonth;
  const currentDayNumber = now.getDate();

  // Selected date marker
  let selectedYear = null;
  let selectedMonth = null;
  let selectedDay = null;
  if (value) {
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      selectedYear = d.getFullYear();
      selectedMonth = d.getMonth();
      selectedDay = d.getDate();
    }
  }

  const isSelected = (day) =>
    selectedYear === viewYear && selectedMonth === viewMonth && selectedDay === day;

  // Min / Max disabled checks
  const isDayDisabled = (day) => {
    const currentIso = `${viewYear}-${pad2(viewMonth + 1)}-${pad2(day)}`;
    if (min && currentIso < min) return true;
    if (max && currentIso > max) return true;
    return false;
  };

  // Year range calculation for Year Picker
  const yearStart = Math.floor(viewYear / 12) * 12;
  const yearRange = Array.from({ length: 12 }, (_, i) => yearStart + i);

  return (
    <div
      ref={containerRef}
      className={cn("relative", isOpen ? "z-50" : "z-auto", className)}
    >
      {/* Trigger Field */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={placeholder}
        className={cn(
          "flex h-11 min-h-11 w-full items-center justify-between gap-2 rounded-2xl border border-input bg-card/95 px-3.5 py-2 text-xs font-semibold text-foreground shadow-2xs backdrop-blur-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          isOpen && "border-orange-500/80 ring-2 ring-orange-500/20"
        )}
      >
        <div className="flex items-center gap-2 truncate">
          <CalendarIcon className="h-4 w-4 shrink-0 text-orange-600 dark:text-orange-400" />
          <span className={cn("truncate font-mono", value ? "text-foreground font-bold" : "text-muted-foreground")}>
            {value ? formatDisplayDate(value) : placeholder}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {value && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") handleClear(e);
              }}
              title="Clear date"
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition"
            >
              <Cross2Icon className="h-3 w-3" />
            </span>
          )}
        </div>
      </button>

      {/* Hidden input for form submission & required validation */}
      <input
        type="hidden"
        id={id}
        name={name}
        value={value}
        required={required}
      />

      {/* Custom Dedicated Calendar Popover */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Date Picker Calendar"
          className="absolute z-50 top-full left-0 mt-1.5 w-72 rounded-3xl border border-border/80 bg-card p-4 text-xs text-card-foreground shadow-scms-modal backdrop-blur-2xl animate-fadeIn"
          style={{ zIndex: 9999 }}
        >
          {/* Header Navigation */}
          <div className="flex items-center justify-between pb-3 border-b border-border/70">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground transition cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setViewMode((m) => (m === "months" ? "days" : "months"))}
                className="font-bold text-xs text-foreground px-2 py-1 rounded-xl hover:bg-secondary transition cursor-pointer"
              >
                {MONTHS[viewMonth]}
              </button>
              <button
                type="button"
                onClick={() => setViewMode((m) => (m === "years" ? "days" : "years"))}
                className="font-bold text-xs text-foreground px-2 py-1 rounded-xl hover:bg-secondary transition cursor-pointer font-mono"
              >
                {viewYear}
              </button>
            </div>

            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground transition cursor-pointer"
              title="Next Month"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>

          {/* Month Picker View */}
          {viewMode === "months" && (
            <div className="grid grid-cols-3 gap-2 py-3">
              {MONTHS.map((mName, idx) => {
                const isSelectedMonth = viewMonth === idx;
                return (
                  <button
                    key={mName}
                    type="button"
                    onClick={() => {
                      setViewMonth(idx);
                      setViewMode("days");
                    }}
                    className={cn(
                      "py-2 rounded-xl text-xs font-semibold transition cursor-pointer text-center",
                      isSelectedMonth
                        ? "bg-orange-500 text-white font-bold shadow-xs"
                        : "hover:bg-secondary text-foreground"
                    )}
                  >
                    {mName.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          )}

          {/* Year Picker View */}
          {viewMode === "years" && (
            <div className="space-y-2 py-2">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
                <span>Decade Selection</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setViewYear((y) => y - 12)}
                    className="p-1 rounded-lg hover:bg-secondary cursor-pointer"
                  >
                    <ChevronLeftIcon className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewYear((y) => y + 12)}
                    className="p-1 rounded-lg hover:bg-secondary cursor-pointer"
                  >
                    <ChevronRightIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {yearRange.map((yr) => {
                  const isSelectedYear = viewYear === yr;
                  return (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => {
                        setViewYear(yr);
                        setViewMode("days");
                      }}
                      className={cn(
                        "py-2 rounded-xl text-xs font-mono font-semibold transition cursor-pointer text-center",
                        isSelectedYear
                          ? "bg-orange-500 text-white font-bold shadow-xs"
                          : "hover:bg-secondary text-foreground"
                      )}
                    >
                      {yr}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Day Grid View */}
          {viewMode === "days" && (
            <div className="pt-3">
              {/* Weekday Labels */}
              <div className="grid grid-cols-7 gap-1 text-center mb-1">
                {WEEKDAYS.map((wd, i) => (
                  <span
                    key={wd}
                    className={cn(
                      "text-[10px] font-bold uppercase",
                      i === 0 || i === 6 ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground"
                    )}
                  >
                    {wd}
                  </span>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {/* Previous month filler days */}
                {Array.from({ length: firstDayIndex }).map((_, idx) => {
                  const prevDay = prevMonthDays - firstDayIndex + idx + 1;
                  return (
                    <span
                      key={`prev-${idx}`}
                      className="grid h-8 place-items-center text-[11px] text-muted-foreground/30 select-none font-mono"
                    >
                      {prevDay}
                    </span>
                  );
                })}

                {/* Current month days */}
                {Array.from({ length: daysInMonth }).map((_, idx) => {
                  const day = idx + 1;
                  const selected = isSelected(day);
                  const isToday = isCurrentMonth && day === currentDayNumber;
                  const dayDisabled = isDayDisabled(day);

                  return (
                    <button
                      key={`day-${day}`}
                      type="button"
                      disabled={dayDisabled}
                      onClick={() => handleSelectDay(day)}
                      className={cn(
                        "grid h-8 w-8 place-items-center rounded-xl text-xs font-mono transition cursor-pointer",
                        selected
                          ? "bg-orange-500 text-white font-bold shadow-xs scale-105"
                          : isToday
                          ? "border border-orange-500 text-orange-600 dark:text-orange-400 font-bold hover:bg-orange-50 dark:hover:bg-orange-950/50"
                          : "text-foreground hover:bg-secondary/80",
                        dayDisabled && "opacity-25 cursor-not-allowed hover:bg-transparent"
                      )}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer Toolbar: Quick Shortcuts */}
          <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/70 text-xs">
            <button
              type="button"
              onClick={handleToday}
              className="text-[11px] font-bold text-orange-600 dark:text-orange-400 hover:underline cursor-pointer"
            >
              Today
            </button>
            <div className="flex items-center gap-2">
              {value && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setViewMode("days");
                }}
                className="scms-btn-sm-primary text-[11px] py-0.5 px-2.5 h-7 min-h-7 font-bold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
