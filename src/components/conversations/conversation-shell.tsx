"use client";

import { RiArrowLeftLine } from "@remixicon/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AGENT_KINDS, modeHref, type AgentKindId } from "@/agents/agent-kinds";
import { AgentAvatar } from "@/components/agents/agent-avatar";
import { ConversationDetailsPanel } from "@/components/conversations/conversation-details-panel";
import { ConversationExportLinks } from "@/components/conversations/conversation-export-links";
import { ConversationProjectPicker } from "@/components/conversations/conversation-project-picker";
import { DeleteAttachmentButton } from "@/components/conversations/delete-attachment-button";
import { DeleteConversationButton } from "@/components/conversations/delete-conversation-button";
import { MessageComposer } from "@/components/conversations/message-composer";
import { MessageList } from "@/components/conversations/message-list";
import { RenameConversationForm } from "@/components/conversations/rename-conversation-form";
import { useConversationStream } from "@/components/conversations/use-conversation-stream";
import { usePanelLayout } from "@/components/conversations/use-panel-layout";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

import type {
  PanelLayout,
  PersistedActivity,
  PersistedMessage,
} from "./conversation-types";

interface ConversationShellProps {
  kind: AgentKindId;
  conversation: { id: string; title: string };
  agent: { id: string; name: string };
  messages: PersistedMessage[];
  activities: PersistedActivity[];
  tasks: { id: string; title: string; status: string }[];
  approvals: { id: string; summary: string; status: string }[];
  project?: { id: string; name: string; sharedMemoryEnabled: boolean };
  projects: { id: string; name: string }[];
  attachments: { id: string; filename: string }[];
  scratchpad: string;
  initialPanelLayout?: PanelLayout;
  runtimeConfigured: boolean;
}

function AttachmentChips({
  attachments,
}: {
  attachments: ConversationShellProps["attachments"];
}) {
  if (attachments.length === 0) return null;
  return (
    <ul
      className="mx-auto mb-3 flex w-full max-w-3xl flex-wrap gap-2"
      aria-label="Attachments"
    >
      {attachments.map((attachment) => (
        <li
          className="flex items-center gap-1 rounded-md border bg-card px-2 py-1 text-xs"
          key={attachment.id}
        >
          <a
            className="max-w-48 truncate hover:underline"
            href={`/api/attachments/${attachment.id}`}
            rel="noreferrer"
            target="_blank"
          >
            {attachment.filename}
          </a>
          <DeleteAttachmentButton
            attachmentId={attachment.id}
            filename={attachment.filename}
          />
        </li>
      ))}
    </ul>
  );
}

/**
 * An open conversation: header, transcript with the docked composer, and the
 * details rail (activity, notes, tasks, approvals).
 */
export function ConversationShell(props: ConversationShellProps) {
  const { kind, conversation, agent, project } = props;
  const router = useRouter();
  const stream = useConversationStream({
    conversationId: conversation.id,
    initialMessages: props.messages,
    initialActivities: props.activities,
  });
  const panels = usePanelLayout(props.initialPanelLayout);
  const backHref = modeHref(kind);

  return (
    <main className="flex h-[calc(100svh-3rem)] flex-col overflow-hidden bg-background">
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
          <DeleteConversationButton
            conversationId={conversation.id}
            redirectHref={backHref}
          />
          <ConversationExportLinks conversationId={conversation.id} />
          <ConversationProjectPicker
            conversationId={conversation.id}
            currentProject={project}
            projects={props.projects}
          />
        </div>
      </header>

      <section className="min-h-0 flex-1 overflow-hidden">
        <ResizablePanelGroup
          className="min-h-0"
          defaultLayout={panels.layout}
          id="pilot-conversation-panels"
          onLayoutChanged={panels.onLayoutChanged}
          orientation={panels.isDesktop ? "horizontal" : "vertical"}
        >
          <ResizablePanel
            defaultSize={`${String(panels.layout.conversation)}%`}
            id="conversation"
            minSize={panels.isDesktop ? "45%" : "50%"}
          >
            <div className="flex h-full min-h-0 min-w-0 flex-col">
              <MessageList
                agentName={agent.name}
                completion={stream.completion}
                isLoading={stream.isLoading}
                messages={stream.messages}
                onAnswer={stream.send}
                pendingPrompt={stream.pendingPrompt}
                streamActivities={stream.currentStreamActivities}
                transientTurns={stream.transientTurns}
              />
              <footer className="shrink-0 border-t bg-background/95 px-4 py-3 backdrop-blur-xl safe-bottom">
                <AttachmentChips attachments={props.attachments} />
                {props.runtimeConfigured ? (
                  <MessageComposer
                    agentName={agent.name}
                    conversationId={conversation.id}
                    draft={stream.draft}
                    isLoading={stream.isLoading}
                    onCancel={stream.cancel}
                    onRestoreLastPrompt={stream.restoreLastPrompt}
                    onSend={stream.send}
                    placeholder={AGENT_KINDS[kind].placeholder}
                    setDraft={stream.setDraft}
                    streamError={stream.streamError}
                    timeoutError={stream.timeoutError}
                  />
                ) : (
                  <p className="mx-auto max-w-3xl rounded-md border bg-muted/40 px-4 py-3 text-center text-xs text-muted-foreground">
                    Messaging becomes available after this environment is
                    connected to Pilot AI.
                  </p>
                )}
              </footer>
            </div>
          </ResizablePanel>
          <ResizableHandle className="bg-border/80" withHandle />
          <ResizablePanel
            defaultSize={`${String(panels.layout.details)}%`}
            id="details"
            minSize={panels.isDesktop ? "18%" : "20%"}
          >
            <ConversationDetailsPanel
              activities={stream.activities}
              approvals={props.approvals}
              conversationId={conversation.id}
              kind={kind}
              onTaskCreated={() => {
                router.refresh();
              }}
              scratchpad={props.scratchpad}
              tasks={props.tasks}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </section>
    </main>
  );
}
