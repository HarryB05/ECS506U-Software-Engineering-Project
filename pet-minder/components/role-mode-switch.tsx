"use client";

import { cn } from "@/lib/utils";
import { useDashboardRole } from "@/components/dashboard-role-context";

export function RoleModeSwitch() {
  const { isDualRole, activeRole, setActiveRole } = useDashboardRole();

  if (!isDualRole) return null;

  return (
    <div
      className="inline-flex shrink-0 rounded-lg border border-border bg-muted/40 p-1"
      role="group"
      aria-label="Switch between pet owner and pet minder"
    >
      <ModeButton
        label="Owner"
        selected={activeRole === "owner"}
        onClick={() => setActiveRole("owner")}
      />
      <ModeButton
        label="Minder"
        selected={activeRole === "minder"}
        onClick={() => setActiveRole("minder")}
      />
    </div>
  );
}

function ModeButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        selected
          ? "bg-card text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
      aria-pressed={selected}
    >
      {label}
    </button>
  );
}

