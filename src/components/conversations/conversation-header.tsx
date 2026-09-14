import { RiArrowLeftLine } from "@remixicon/react";
import Link from "next/link";

import { AGENT_KINDS, type AgentKindId } from "@/agents/agent-kinds";
import { AgentAvatar } from "@/components/agents/agent-avatar";
import { ConversationExportLinks } from "@/components/conversations/conversation-export-links";
import { ConversationProjectPicker } from "@/components/conversations/conversation-project-picker";
import { DeleteConversationButton } from "@/components/conversations/delete-conversation-button";
import { RenameConversationForm } from "@/components/conversations/rename-conversation-form";

interface ConversationHeaderProps {
  kind: AgentKindId;
  conversation: { id: string; title: string };
  agent: { id: string; name: string };
  project?: { id: string; name: string; sharedMemoryEnabled: boolean };
  projects: { id: string; name: string }[];
  backHref: string;
}

/**
 * The fixed 3rem bar above the transcript: back link, agent identity, and
 * conversation actions. `ConversationShell` accounts for this header's own
 * height on top of the workspace shell's header when sizing the transcript.
 */
export function ConversationHeader({
  kind,
  conversation,
  agent,
  project,
  projects,
  backHref,
}: ConversationHeaderProps) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b px-4">
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
      <div className="flex items-center gap-1">
        <RenameConversationForm
          conversationId={conversation.id}
          title={conversation.title}
        />
        <DeleteConversationButton conversationId={conversation.id} />
        <ConversationExportLinks conversationId={conversation.id} />
        <ConversationProjectPicker
          conversationId={conversation.id}
          currentProject={project}
          projects={projects}
        />
      </div>
    </header>
  );
}
