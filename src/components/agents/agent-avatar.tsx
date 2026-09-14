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

export function AgentAvatar({
  className,
  name,
}: {
  className?: string;
  name: string;
}) {
  return (
    <Avatar className={cn("size-6", className)}>
      <AvatarFallback className="bg-primary/15 text-primary">
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
