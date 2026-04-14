import { cn } from "@/lib/utils";

type BookingStatus =
  | "pending"
  | "confirmed"
  | "active"
  | "completed"
  | "cancelled"
  | "disputed";

const config: Record<
  BookingStatus,
  { label: string; className: string }
> = {
  pending: {
    label: "Pending",
    className:
      "bg-warning-100 text-warning-500 border-warning-500/20",
  },
  confirmed: {
    label: "Confirmed",
    className:
      "bg-primary/12 text-primary border-primary/25 dark:bg-primary/18 dark:border-primary/35",
  },
  active: {
    label: "Live",
    className:
      "bg-amber-100 text-amber-500 border-amber-500/20 animate-card-glow",
  },
  completed: {
    label: "Completed",
    className:
      "bg-success-100 text-success-500 border-success-500/20",
  },
  cancelled: {
    label: "Cancelled",
    className:
      "bg-muted text-muted-foreground border-transparent",
  },
  disputed: {
    label: "Disputed",
    className:
      "bg-danger-100 text-danger-500 border-danger-500/20",
  },
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  const { label, className } = config[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium uppercase tracking-wide border",
        className
      )}
    >
      {status === "active" && (
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-live-pulse" />
      )}
      {label}
    </span>
  );
}

export type BookingRequestStatus =
  | "pending"
  | "confirmed"
  | "declined"
  | "cancelled";

const requestConfig: Record<
  BookingRequestStatus,
  { label: string; className: string }
> = {
  pending: {
    label: "Pending",
    className:
      "bg-warning-100 text-warning-500 border-warning-500/20",
  },
  confirmed: {
    label: "Confirmed",
    className: "bg-success-100 text-success-500 border-success-500/20",
  },
  declined: {
    label: "Declined",
    className:
      "bg-muted text-muted-foreground border-transparent",
  },
  cancelled: {
    label: "Cancelled",
    className:
      "bg-muted text-muted-foreground border-transparent",
  },
};

export function BookingRequestStatusBadge({
  status,
}: {
  status: BookingRequestStatus;
}) {
  const { label, className } = requestConfig[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium uppercase tracking-wide border",
        className
      )}
    >
      {label}
    </span>
  );
}
