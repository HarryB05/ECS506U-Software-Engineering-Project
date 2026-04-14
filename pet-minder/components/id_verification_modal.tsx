"use client";
// components/id-verification-modal.tsx
// Multi-step upload modal.
// - Owners:  Step 1 = government ID
// - Minders: Step 1 = government ID  →  Step 2 = certificate(s)
//
// On submit each file is POSTed to /api/verify-document which
// uploads to Storage and runs Gemini. The result (approved / rejected)
// is shown inline.

import { useRef, useState } from "react";
import {
  CheckCircle2,
  FileText,
  Loader2,
  ShieldAlert,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import type { UserVerificationSummary, IdVerificationStatus } from "@/lib/types/id-verification";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Sub-types
// ---------------------------------------------------------------------------
type DocSlot = {
  label: string;
  hint: string;
  fieldName: "identity" | "certificate";
};

type SlotState = {
  file: File | null;
  loading: boolean;
  status: IdVerificationStatus | null;
  reason: string | null;
  error: string | null;
};

const EMPTY_SLOT: SlotState = {
  file: null,
  loading: false,
  status: null,
  reason: null,
  error: null,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function ResultBadge({ state }: { state: SlotState }) {
  if (!state.status && !state.error) return null;

  if (state.error) {
    return (
      <div className="flex items-start gap-2 rounded-md border border-danger-200 bg-danger-100 p-3">
        <XCircle className="mt-0.5 size-4 shrink-0 text-danger-500" />
        <p className="text-xs text-danger-700">{state.error}</p>
      </div>
    );
  }

  const ok = state.status === "approved";
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-md border p-3",
        ok
          ? "border-success-200 bg-success-100"
          : "border-danger-200 bg-danger-100",
      )}
    >
      {ok ? (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success-500" />
      ) : (
        <XCircle className="mt-0.5 size-4 shrink-0 text-danger-500" />
      )}
      <div>
        <p className={cn("text-xs font-medium", ok ? "text-success-700" : "text-danger-700")}>
          {ok ? "Approved" : "Rejected"}
        </p>
        {state.reason ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{state.reason}</p>
        ) : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// File drop zone
// ---------------------------------------------------------------------------
function FileDropZone({
  slot,
  onChange,
  disabled,
}: {
  slot: SlotState;
  onChange: (file: File) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function accept(file: File) {
    const ok = ["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(file.type);
    if (!ok) return;
    if (file.size > 10 * 1024 * 1024) return;
    onChange(file);
  }

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => e.key === "Enter" && !disabled && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files[0];
        if (f) accept(f);
      }}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors",
        dragOver && "border-teal-400 bg-teal-50",
        !dragOver && "border-border hover:border-teal-300",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="sr-only"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) accept(f); }}
        disabled={disabled}
      />
      <Upload className="size-7 text-muted-foreground" />
      {slot.file ? (
        <p className="text-xs text-foreground">
          {slot.file.name}{" "}
          <span className="text-muted-foreground">
            ({(slot.file.size / 1024 / 1024).toFixed(2)} MB)
          </span>
        </p>
      ) : (
        <>
          <p className="text-sm font-medium text-foreground">Click or drag file here</p>
          <p className="text-xs text-muted-foreground">JPEG, PNG, WEBP or PDF · max 10 MB</p>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main modal
// ---------------------------------------------------------------------------
interface IdVerificationModalProps {
  userId: string;
  isMinder: boolean;
  currentSummary: UserVerificationSummary;
  onClose: (submitted: boolean) => void;
}

export function IdVerificationModal({
  userId,
  isMinder,
  currentSummary,
  onClose,
}: IdVerificationModalProps) {
  // Define which doc slots to show
  const slots: DocSlot[] = [
    {
      label: "Government-issued ID",
      hint: "Passport, driver's licence, or national ID card",
      fieldName: "identity",
    },
    ...(isMinder
      ? [
          {
            label: "Professional Certificate",
            hint: "DBS Enhanced, animal first aid, animal welfare licence, etc.",
            fieldName: "certificate" as const,
          },
        ]
      : []),
  ];

  const [states, setStates] = useState<Record<string, SlotState>>(
    Object.fromEntries(slots.map((s) => [s.fieldName, { ...EMPTY_SLOT }])),
  );

  function setSlot(fieldName: string, patch: Partial<SlotState>) {
    setStates((prev) => ({
      ...prev,
      [fieldName]: { ...prev[fieldName], ...patch },
    }));
  }

  async function handleSubmit(fieldName: string) {
    const slot = states[fieldName];
    if (!slot.file) return;

    setSlot(fieldName, { loading: true, error: null });

    try {
      const form = new FormData();
      form.append("file", slot.file);
      form.append("userId", userId);
      form.append("docType", fieldName);

      const res = await fetch("/api/verify-document", { method: "POST", body: form });
      const data = await res.json();

      if (!res.ok) {
        setSlot(fieldName, { loading: false, error: data.error ?? "Verification failed" });
        return;
      }

      setSlot(fieldName, {
        loading: false,
        status: data.status,
        reason: data.reason,
      });
    } catch {
      setSlot(fieldName, { loading: false, error: "Network error — please try again." });
    }
  }

  // Whether all required slots are done (approved or at least attempted)
  const allDone = slots.every(
    (s) => states[s.fieldName].status !== null,
  );

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="ID Verification"
    >
      <div className="w-full max-w-lg overflow-y-auto rounded-2xl bg-card shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="font-display text-lg font-medium text-foreground">
              Verify your identity
            </h2>
            <p className="text-xs text-muted-foreground">
              Documents are checked automatically and stored securely.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onClose(false)}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-5 px-6 py-5">
          {slots.map((slot) => {
            const s = states[slot.fieldName];
            const isDone = s.status === "approved";
            const alreadyApproved =
              slot.fieldName === "identity"
                ? currentSummary.identityStatus === "approved"
                : currentSummary.certificateStatus === "approved";

            return (
              <Card
                key={slot.fieldName}
                className={cn(
                  "border-border shadow-card",
                  isDone || alreadyApproved ? "border-success-300" : "",
                )}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base font-medium">
                    <FileText className="size-4 text-teal-500" />
                    {slot.label}
                  </CardTitle>
                  <CardDescription className="text-xs">{slot.hint}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {alreadyApproved && !isDone ? (
                    <div className="flex items-center gap-2 rounded-md border border-success-200 bg-success-100 p-3">
                      <CheckCircle2 className="size-4 text-success-500" />
                      <p className="text-xs font-medium text-success-700">
                        Already approved — no need to re-upload.
                      </p>
                    </div>
                  ) : (
                    <>
                      <FileDropZone
                        slot={s}
                        disabled={isDone || s.loading}
                        onChange={(file) => setSlot(slot.fieldName, { file, error: null, status: null })}
                      />
                      <ResultBadge state={s} />
                      <Button
                        type="button"
                        size="sm"
                        className="w-full"
                        disabled={!s.file || s.loading || isDone}
                        onClick={() => handleSubmit(slot.fieldName)}
                      >
                        {s.loading ? (
                          <>
                            <Loader2 className="mr-2 size-4 animate-spin" />
                            Analysing…
                          </>
                        ) : isDone ? (
                          <>
                            <CheckCircle2 className="mr-2 size-4" />
                            Approved
                          </>
                        ) : (
                          "Submit for verification"
                        )}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {/* Disclaimer */}
          <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Documents are scanned by an AI assistant and stored in a private,
              encrypted bucket. Admins can view them only if a dispute arises.
              Verification can be revoked at any time by our team.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-border px-6 py-4">
          <Button
            type="button"
            variant={allDone ? "default" : "outline"}
            onClick={() => onClose(allDone)}
          >
            {allDone ? "Done" : "Close"}
          </Button>
        </div>
      </div>
    </div>
  );
}