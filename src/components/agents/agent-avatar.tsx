import { cn } from "cn";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";

function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return (
    words
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase() || "P"
  );
}

// Deterministic per-agent tinting built from the theme's own chart tokens,
// so an agent's color follows a re-theme instead of staying pinned to raw
// Tailwind hues chosen independently of the palette.
const TOKEN_TREATMENTS = [
  "bg-chart-1/25 text-chart-1",
  "bg-chart-2/25 text-chart-2",
  "bg-chart-3/25 text-chart-3",
  "bg-chart-4/25 text-chart-4",
  "bg-chart-5/25 text-chart-5",
] as const;

function treatmentFor(name: string) {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + (name.codePointAt(index) ?? 0)) >>> 0;
  }
  return TOKEN_TREATMENTS[hash % TOKEN_TREATMENTS.length];
}

export function AgentAvatar({
  className,
  name,
}: {
  className?: string;
  name: string;
}) {
  return (
    <Avatar className={cn("size-6 shadow-sm", className)}>
      <AvatarFallback
        className={cn("font-semibold text-[0.65em]", treatmentFor(name))}
      >
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
