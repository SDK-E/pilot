import { RiArrowLeftLine } from "@remixicon/react";
import Link from "next/link";

import { AGENT_KINDS, type AgentKindId } from "@/agents/agent-kinds";
import { AgentAvatar } from "@/components/agents/agent-avatar";
import { ConversationActionsMenu } from "@/components/conversations/conversation-actions-menu";
import { PlanProgressBadge } from "@/components/conversations/plan-progress-badge";

import type { ConversationPlanStep } from "@/db/schema";

interface ConversationHeaderProps {
  kind: AgentKindId;
  conversation: { id: string; title: string };
  agent: { id: string; name: string };
  project?: { id: string; name: string; sharedMemoryEnabled: boolean };
  projects: { id: string; name: string }[];
  backHref: string;
  plan: ConversationPlanStep[];
  onOpenPlan: () => void;
}

/**
 * The `--header-height` bar above the transcript: back link, agent identity,
 * and conversation actions. `ConversationShell` accounts for this header's
 * own height on top of the workspace shell's header when sizing the
 * transcript (see the comment there on why these stay two separate bars).
 */
export function ConversationHeader({
  kind,
  conversation,
  agent,
  project,
  projects,
  backHref,
  plan,
  onOpenPlan,
}: ConversationHeaderProps) {
  return (
    <header className="flex h-(--header-height) shrink-0 items-center justify-between gap-2 border-b px-4">
      <Link
        className="inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
        href={backHref}
      >
        <RiArrowLeftLine aria-hidden="true" />
        <span className="hidden sm:inline">
          New {AGENT_KINDS[kind].name.toLowerCase()}
        </span>
      </Link>
      <div className="flex min-w-0 items-center gap-2 text-center">
        <AgentAvatar name={agent.name} />
        <div className="min-w-0">
          <p className="truncate text-xs font-medium">{agent.name}</p>
          {project ? (
            <Link
              className="block truncate text-xs text-primary hover:underline"
              href={`/projects/${project.id}`}
            >
              {project.name} ·{" "}
              {project.sharedMemoryEnabled
                ? "Shared memory on"
                : "Project context"}
            </Link>
          ) : (
            <p className="truncate text-xs text-muted-foreground">
              {conversation.title}
            </p>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <PlanProgressBadge onClick={onOpenPlan} steps={plan} />
        <ConversationActionsMenu
          conversationId={conversation.id}
          project={project}
          projects={projects}
          title={conversation.title}
        />
      </div>
    </header>
  );
}
