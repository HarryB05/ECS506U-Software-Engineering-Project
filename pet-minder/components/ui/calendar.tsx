"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";

import "react-day-picker/style.css";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

/**
 * Calendar for date picking (react-day-picker v9 + default stylesheet).
 * Wrapped so we can theme via `.booking-day-picker` in globals.css.
 */
function Calendar({ className, ...props }: CalendarProps) {
  return (
    <div className={cn("booking-day-picker", className)}>
      <DayPicker {...props} />
    </div>
  );
}

Calendar.displayName = "Calendar";

export { Calendar };
