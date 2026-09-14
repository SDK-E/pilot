import { Briefcase, Code2, MessageSquare } from "lucide-react";

import type { AgentKindId } from "@/agents/agent-kinds";
import type { LucideProps } from "lucide-react";

const ICONS = {
  chat: MessageSquare,
  work: Briefcase,
  code: Code2,
} satisfies Record<AgentKindId, React.ComponentType<LucideProps>>;

export function ModeIcon({
  kind,
  ...props
}: LucideProps & { kind: AgentKindId }) {
  const Icon = ICONS[kind];
  return <Icon aria-hidden="true" {...props} />;
}
