import {
  RiBriefcaseLine,
  RiChat1Line,
  RiCodeSSlashLine,
  type RemixiconComponentType,
} from "@remixicon/react";

import type { AgentKindId } from "@/agents/agent-kinds";

const ICONS: Record<AgentKindId, RemixiconComponentType> = {
  chat: RiChat1Line,
  work: RiBriefcaseLine,
  code: RiCodeSSlashLine,
};

export function ModeIcon({
  kind,
  ...props
}: React.ComponentProps<RemixiconComponentType> & { kind: AgentKindId }) {
  const Icon = ICONS[kind];
  return <Icon aria-hidden="true" {...props} />;
}
