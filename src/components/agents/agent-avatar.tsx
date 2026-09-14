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

// A small, fixed set of on-brand gradients so every agent gets a distinct,
// deterministic look without reaching for per-pixel random hues that could
// clash with the theme.
const GRADIENTS = [
  "from-violet-500 to-indigo-600",
  "from-blue-500 to-cyan-500",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
  "from-fuchsia-500 to-purple-600",
] as const;

function gradientFor(name: string) {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + (name.codePointAt(index) ?? 0)) >>> 0;
  }
  return GRADIENTS[hash % GRADIENTS.length];
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
        className={cn(
          "bg-gradient-to-br font-semibold text-[0.65em] text-white",
          gradientFor(name),
        )}
      >
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
