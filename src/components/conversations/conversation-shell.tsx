"use client";

import { RiArrowDownSLine } from "@remixicon/react";
import { cn } from "cn";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AGENT_KINDS, modeHref, type AgentKindId } from "@/agents/agent-kinds";
import { ConversationDetailsPanel } from "@/components/conversations/conversation-details-panel";
import { ConversationHeader } from "@/components/conversations/conversation-header";
import { DeleteAttachmentButton } from "@/components/conversations/delete-attachment-button";
import { MessageComposer } from "@/components/conversations/message-composer";
import { MessageList } from "@/components/conversations/message-list";
import { useConversationStream } from "@/components/conversations/use-conversation-stream";
import { usePanelLayout } from "@/components/conversations/use-panel-layout";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import type { ConversationPlanStep } from "@/db/schema";

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
  plan: ConversationPlanStep[];
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

interface ComposerFooterProps {
  agentName: string;
  attachments: ConversationShellProps["attachments"];
  conversationId: string;
  kind: AgentKindId;
  runtimeConfigured: boolean;
  stream: ReturnType<typeof useConversationStream>;
}

function ComposerFooter({
  agentName,
  attachments,
  conversationId,
  kind,
  runtimeConfigured,
  stream,
}: ComposerFooterProps) {
  return (
    <footer className="sticky bottom-0 z-10 shrink-0 border-t bg-background/95 px-4 py-3 backdrop-blur-xl safe-bottom">
      <AttachmentChips attachments={attachments} />
      {runtimeConfigured ? (
        <MessageComposer
          agentName={agentName}
          conversationId={conversationId}
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
          Messaging becomes available after this environment is connected to
          Pilot AI.
        </p>
      )}
    </footer>
  );
}

/**
 * Below the composer on desktop's side-by-side rail, this same content is a
 * collapsed-by-default drawer on mobile so it never crowds out the chat.
 */
function MobileDetailsDisclosure({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Collapsible
      className="shrink-0 border-t bg-sidebar/40"
      onOpenChange={setIsOpen}
      open={isOpen}
    >
      <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-2 text-xs font-medium">
        <span>Agent activity &amp; controls</span>
        <RiArrowDownSLine
          aria-hidden="true"
          className={cn(
            "size-4 text-muted-foreground transition-transform",
            isOpen && "rotate-180",
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="max-h-[45svh] overflow-y-auto border-t">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

/**
 * An open conversation: header, transcript with the docked composer, and the
 * details rail (activity, notes, tasks, approvals) — a resizable side panel
 * on desktop, a collapsed-by-default drawer above the composer on mobile.
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

  const renderDetailsPanel = (shouldFillHeight: boolean) => (
    <ConversationDetailsPanel
      activities={stream.activities}
      approvals={props.approvals}
      conversationId={conversation.id}
      fillHeight={shouldFillHeight}
      kind={kind}
      onTaskCreated={() => {
        router.refresh();
      }}
      plan={props.plan}
      scratchpad={props.scratchpad}
      tasks={props.tasks}
    />
  );

  const transcript = (
    <MessageList
      activities={stream.activities}
      agentName={agent.name}
      completion={stream.completion}
      isLoading={stream.isLoading}
      messages={stream.messages}
      onAnswer={stream.send}
      pendingPrompt={stream.pendingPrompt}
      streamActivities={stream.currentStreamActivities}
      transientTurns={stream.transientTurns}
    />
  );

  const composer = (
    <ComposerFooter
      agentName={agent.name}
      attachments={props.attachments}
      conversationId={conversation.id}
      kind={kind}
      runtimeConfigured={props.runtimeConfigured}
      stream={stream}
    />
  );

  return (
    <main className="flex h-[calc(100svh-6rem)] flex-col overflow-hidden bg-background">
      <ConversationHeader
        agent={agent}
        backHref={backHref}
        conversation={conversation}
        kind={kind}
        project={project}
        projects={props.projects}
      />

      <section className="min-h-0 flex-1 overflow-hidden">
        {panels.isDesktop ? (
          <ResizablePanelGroup
            className="min-h-0"
            defaultLayout={panels.layout}
            id="pilot-conversation-panels"
            onLayoutChanged={panels.onLayoutChanged}
            orientation="horizontal"
          >
            <ResizablePanel
              defaultSize={`${String(panels.layout.conversation)}%`}
              id="conversation"
              minSize="45%"
            >
              <div className="flex h-full min-h-0 min-w-0 flex-col">
                {transcript}
                {composer}
              </div>
            </ResizablePanel>
            <ResizableHandle className="bg-border/80" withHandle />
            <ResizablePanel
              defaultSize={`${String(panels.layout.details)}%`}
              id="details"
              minSize="18%"
            >
              {renderDetailsPanel(true)}
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <div className="flex h-full min-h-0 min-w-0 flex-col">
            {transcript}
            <MobileDetailsDisclosure>
              {renderDetailsPanel(false)}
            </MobileDetailsDisclosure>
            {composer}
          </div>
        )}
      </section>
    </main>
  );
}
