import { cn } from "@/lib/utils";

type TimelineStep = {
  id: string;
  title: string;
  timestamp?: string;
  body?: string;
};

export function BookingLifecycleTimeline({ steps }: { steps: TimelineStep[] }) {
  if (steps.length === 0) return null;

  return (
    <ol className="m-0 list-none p-0" role="list">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        return (
          <li key={step.id} className="flex gap-5">
            <div className="flex w-10 shrink-0 flex-col items-center self-stretch pt-0.5">
              <span
                className="relative z-[1] flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-[0.6875rem] font-bold tabular-nums text-primary-foreground shadow-sm ring-[3px] ring-card"
                aria-hidden
              >
                {index + 1}
              </span>
              {!isLast ? (
                <span
                  className="mt-2.5 w-px flex-1 min-h-[2.75rem] rounded-full bg-gradient-to-b from-primary via-primary/35 to-border"
                  aria-hidden
                />
              ) : null}
            </div>
            <div
              className={cn(
                "min-w-0 flex-1 space-y-2 pt-0.5",
                !isLast && "pb-10",
              )}
            >
              <div>
                <p className="text-base font-semibold leading-snug tracking-tight text-foreground">
                  {step.title}
                </p>
                {step.timestamp ? (
                  <p className="mt-1.5 text-sm leading-snug text-muted-foreground">
                    {step.timestamp}
                  </p>
                ) : null}
              </div>
              {step.body ? (
                <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
