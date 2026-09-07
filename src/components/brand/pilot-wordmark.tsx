import { cn } from "cn";

export function PilotWordmark({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-label="Pilot"
      className={cn(
        "inline-flex items-baseline font-semibold tracking-tight",
        className,
      )}
    >
      {compact ? "P" : "Pilot"}
      {!compact ? <span className="text-primary">.</span> : null}
    </span>
  );
}
