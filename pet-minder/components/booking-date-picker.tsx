"use client";

import { useState } from "react";
import { format, parse, startOfDay } from "date-fns";
import { enGB } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function parseIsoDate(value: string): Date | undefined {
  if (!value) return undefined;
  try {
    return parse(value, "yyyy-MM-dd", new Date());
  } catch {
    return undefined;
  }
}

function toIsoDate(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export type BookingDatePickerProps = {
  id: string;
  label: string;
  value: string;
  onChange: (isoDate: string) => void;
  /** Inclusive minimum selectable calendar day */
  minDate?: Date;
  placeholder?: string;
  className?: string;
};

export function BookingDatePicker({
  id,
  label,
  value,
  onChange,
  minDate,
  placeholder = "Choose date",
  className,
}: BookingDatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = parseIsoDate(value);
  const min = minDate ? startOfDay(minDate) : undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            className={cn(
              "h-10 w-full justify-start text-left font-normal shadow-sm",
              !value && "text-muted-foreground",
            )}
            aria-expanded={open}
            aria-haspopup="dialog"
          >
            <CalendarIcon className="mr-2 size-4 shrink-0 opacity-70" />
            {selected ? (
              format(selected, "EEE d MMM yyyy", { locale: enGB })
            ) : (
              <span>{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            locale={enGB}
            selected={selected}
            defaultMonth={selected ?? min ?? new Date()}
            onSelect={(d) => {
              if (d) {
                onChange(toIsoDate(d));
                setOpen(false);
              }
            }}
            disabled={min ? { before: min } : undefined}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
