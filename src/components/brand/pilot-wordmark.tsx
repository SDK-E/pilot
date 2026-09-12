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
      className={cn(
        "inline-flex items-baseline font-semibold tracking-tight",
        className,
      )}
    >
      {compact ? "P" : "Pilot"}
      <span className="text-primary">.</span>
    </span>
  );
}
