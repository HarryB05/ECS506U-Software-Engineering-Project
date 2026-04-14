"use client";

import { useState } from "react";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import {
  addAvailabilitySlot,
  deleteAvailabilitySlot,
  toDisplayTime,
} from "@/lib/availability-service";
import {
  DAYS_OF_WEEK,
  DAY_LABEL,
  type DayOfWeek,
  type MinderAvailabilitySlot,
} from "@/lib/types/availability";

type Props = {
  minderProfileId: string;
  initialSlots: MinderAvailabilitySlot[];
};

type AddFormState = {
  start: string;
  end: string;
  saving: boolean;
  error: string | null;
};

export function AvailabilityScheduleEditor({
  minderProfileId,
  initialSlots,
}: Props) {
  const [slots, setSlots] = useState<MinderAvailabilitySlot[]>(initialSlots);
  const [addingFor, setAddingFor] = useState<DayOfWeek | null>(null);
  const [addForm, setAddForm] = useState<AddFormState>({
    start: "09:00",
    end: "17:00",
    saving: false,
    error: null,
  });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function slotsForDay(day: DayOfWeek) {
    return slots.filter((s) => s.day_of_week === day);
  }

  /** Returns true when [newStart, newEnd) overlaps any existing slot on the same day. */
  function overlapsExisting(day: DayOfWeek, newStart: string, newEnd: string): boolean {
    return slotsForDay(day).some(
      (s) => newStart < toDisplayTime(s.end_time) && newEnd > toDisplayTime(s.start_time),
    );
  }

  function openAddForm(day: DayOfWeek) {
    setAddingFor(day);
    setAddForm({ start: "09:00", end: "17:00", saving: false, error: null });
  }

  function closeAddForm() {
    setAddingFor(null);
    setAddForm({ start: "09:00", end: "17:00", saving: false, error: null });
  }

  async function handleAdd(day: DayOfWeek) {
    if (!addForm.start || !addForm.end) {
      setAddForm((f) => ({ ...f, error: "Enter both a start and end time." }));
      return;
    }
    if (addForm.start >= addForm.end) {
      setAddForm((f) => ({
        ...f,
        error: "End time must be after start time.",
      }));
      return;
    }

    if (overlapsExisting(day, addForm.start, addForm.end)) {
      setAddForm((f) => ({
        ...f,
        error: "This slot overlaps an existing one. Remove the existing slot first or choose different times.",
      }));
      return;
    }

    setAddForm((f) => ({ ...f, saving: true, error: null }));
    const supabase = createClient();
    const { data, error } = await addAvailabilitySlot(
      supabase,
      minderProfileId,
      day,
      addForm.start,
      addForm.end,
    );

    if (error || !data) {
      setAddForm((f) => ({
        ...f,
        saving: false,
        error: error?.message ?? "Could not save slot.",
      }));
      return;
    }

    setSlots((prev) => [...prev, data]);
    closeAddForm();
  }

  async function handleDelete(slotId: string) {
    setDeletingId(slotId);
    const supabase = createClient();
    const { error } = await deleteAvailabilitySlot(supabase, slotId);
    if (!error) {
      setSlots((prev) => prev.filter((s) => s.id !== slotId));
    }
    setDeletingId(null);
  }

  return (
    <div className="space-y-1 divide-y divide-border">
      {DAYS_OF_WEEK.map((day) => {
        const daySlots = slotsForDay(day);
        const isAdding = addingFor === day;

        return (
          <div key={day} className="py-4 first:pt-0 last:pb-0">
            <div className="flex items-center justify-between gap-4 mb-3">
              <p className="text-sm font-medium text-foreground">
                {DAY_LABEL[day]}
              </p>
              {!isAdding && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 text-xs text-primary hover:text-primary"
                  onClick={() => openAddForm(day)}
                >
                  <Plus className="size-3.5" />
                  Add slot
                </Button>
              )}
            </div>

            {daySlots.length === 0 && !isAdding && (
              <p className="text-sm text-muted-foreground pl-0.5">
                No availability set.
              </p>
            )}

            {daySlots.length > 0 && (
              <ul className="space-y-1.5 mb-3">
                {daySlots.map((slot) => {
                  const isDeleting = deletingId === slot.id;
                  return (
                    <li
                      key={slot.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-secondary/30 px-3 py-2 text-sm"
                    >
                      <span className="font-medium text-foreground tabular-nums">
                        {toDisplayTime(slot.start_time)}
                        <span className="mx-1.5 text-muted-foreground">–</span>
                        {toDisplayTime(slot.end_time)}
                      </span>
                      <button
                        type="button"
                        aria-label={`Remove ${toDisplayTime(slot.start_time)}–${toDisplayTime(slot.end_time)} on ${DAY_LABEL[day]}`}
                        onClick={() => handleDelete(slot.id)}
                        disabled={isDeleting}
                        className="text-muted-foreground hover:text-danger-500 transition-colors disabled:opacity-40"
                      >
                        {isDeleting ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Trash2 className="size-4" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {isAdding && (
              <div className="rounded-lg border border-border bg-card p-3 space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  New slot for {DAY_LABEL[day]}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor={`start-${day}`} className="text-xs">
                      From
                    </Label>
                    <Input
                      id={`start-${day}`}
                      type="time"
                      min="00:00"
                      max="23:59"
                      value={addForm.start}
                      onChange={(e) =>
                        setAddForm((f) => ({
                          ...f,
                          start: e.target.value,
                          error: null,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`end-${day}`} className="text-xs">
                      Until
                    </Label>
                    <Input
                      id={`end-${day}`}
                      type="time"
                      min="00:00"
                      max="23:59"
                      value={addForm.end}
                      onChange={(e) =>
                        setAddForm((f) => ({
                          ...f,
                          end: e.target.value,
                          error: null,
                        }))
                      }
                    />
                  </div>
                </div>
                {addForm.error && (
                  <p className="text-xs text-danger-500" role="alert">
                    {addForm.error}
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    className="h-8"
                    disabled={addForm.saving}
                    onClick={() => handleAdd(day)}
                  >
                    {addForm.saving ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin mr-1.5" />
                        Saving…
                      </>
                    ) : (
                      "Add"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-muted-foreground"
                    onClick={closeAddForm}
                    disabled={addForm.saving}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
