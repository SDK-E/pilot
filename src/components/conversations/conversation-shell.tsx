"use client";

import { RiArrowDownSLine } from "@remixicon/react";
import { cn } from "cn";
import { useMemo, useState } from "react";

import { AGENT_KINDS, modeHref, type AgentKindId } from "@/agents/agent-kinds";
import { ConversationDetailsPanel } from "@/components/conversations/conversation-details-panel";
import { ConversationHeader } from "@/components/conversations/conversation-header";
import { DeleteAttachmentButton } from "@/components/conversations/delete-attachment-button";
import { MessageComposer } from "@/components/conversations/message-composer";
import { MessageList } from "@/components/conversations/message-list";
import { useConversationStream } from "@/components/conversations/use-conversation-stream";
import { usePanelLayout } from "@/components/conversations/use-panel-layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import { WorkspaceHeaderContent } from "@/components/workspace/workspace-header-slot";

import type {
  PanelLayout,
  PersistedActivity,
  PersistedMessage,
} from "./conversation-types";
import type { ComposerSkill } from "@/components/conversations/skill-picker";
import type { ConversationPlanStep } from "@/db/schema";

interface ConversationShellProps {
  kind: AgentKindId;
  conversation: { id: string; title: string };
  agent: { id: string; name: string };
  messages: PersistedMessage[];
  activities: PersistedActivity[];
  project?: { id: string; name: string; sharedMemoryEnabled: boolean };
  projects: { id: string; name: string }[];
  attachments: { id: string; filename: string; messageId: string | null }[];
  hasConnector: boolean;
  skills: ComposerSkill[];
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
  const unscoped = attachments.filter(
    (attachment) => attachment.messageId === null,
  );
  if (unscoped.length === 0) return null;
  return (
    <ul
      className="mx-auto mb-3 flex w-full max-w-3xl flex-wrap gap-2"
      aria-label="Attachments"
    >
      {unscoped.map((attachment) => (
        <li key={attachment.id}>
          <Badge className="h-7 max-w-64 gap-1 pr-1 pl-2" variant="outline">
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
          </Badge>
        </li>
      ))}
    </ul>
  );
}

interface ComposerFooterProps {
  agentId: string;
  agentName: string;
  attachments: ConversationShellProps["attachments"];
  hasConnector: boolean;
  skills: ComposerSkill[];
  conversationId: string;
  kind: AgentKindId;
  runtimeConfigured: boolean;
  stream: ReturnType<typeof useConversationStream>;
}

function ComposerFooter({
  agentId,
  agentName,
  attachments,
  hasConnector,
  skills,
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
          agentId={agentId}
          agentName={agentName}
          hasConnector={hasConnector}
          conversationId={conversationId}
          draft={stream.draft}
          isLoading={stream.isLoading || stream.isBackgroundRunning}
          onCancel={stream.cancel}
          onRestoreLastPrompt={stream.restoreLastPrompt}
          onSend={stream.send}
          placeholder={AGENT_KINDS[kind].placeholder}
          setDraft={stream.setDraft}
          skills={skills}
          streamError={stream.streamError}
          timeoutError={stream.timeoutError}
        />
      ) : (
        <Alert className="mx-auto max-w-3xl">
          <AlertTitle>Messaging unavailable</AlertTitle>
          <AlertDescription>
            Messaging becomes available after this environment is connected to
            Pilot AI.
          </AlertDescription>
        </Alert>
      )}
    </footer>
  );
}

function MobileDetailsDisclosure({
  children,
  isOpen,
  onOpenChange,
}: {
  children: React.ReactNode;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}) {
  return (
    <Collapsible
      className="shrink-0 border-t bg-sidebar/40"
      onOpenChange={onOpenChange}
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

export function ConversationShell(props: ConversationShellProps) {
  const { kind, conversation, agent, project } = props;
  const messagesWithAttachments = useMemo(
    () =>
      props.messages.map((message) => ({
        ...message,
        attachments: props.attachments.filter(
          (attachment) => attachment.messageId === message.id,
        ),
      })),
    [props.attachments, props.messages],
  );
  const stream = useConversationStream({
    conversationId: conversation.id,
    initialMessages: messagesWithAttachments,
    initialActivities: props.activities,
  });
  const panels = usePanelLayout(props.initialPanelLayout);
  const backHref = modeHref(kind);
  const [isMobileDetailsOpen, setIsMobileDetailsOpen] = useState(false);
  const openPlan = () => {
    if (!panels.isDesktop) setIsMobileDetailsOpen(true);
  };

  const renderDetailsPanel = (shouldFillHeight: boolean) => (
    <ConversationDetailsPanel
      activities={stream.activities}
      fillHeight={shouldFillHeight}
      plan={props.plan}
      scratchpad={props.scratchpad}
    />
  );

  const transcript = (
    <MessageList
      activities={stream.activities}
      agentName={agent.name}
      completion={stream.completion}
      conversationId={conversation.id}
      isBackgroundRunning={stream.isBackgroundRunning}
      isDetailsPanelVisible={panels.isDesktop}
      isLoading={stream.isLoading}
      messages={stream.messages}
      onAnswer={stream.send}
      onContinue={stream.continueMessage}
      onEditMessage={stream.editMessage}
      onRegenerate={stream.regenerate}
      pendingPrompt={stream.pendingPrompt}
      streamActivities={stream.currentStreamActivities}
      transientTurns={stream.transientTurns}
    />
  );

  const composer = (
    <ComposerFooter
      agentId={agent.id}
      agentName={agent.name}
      attachments={props.attachments}
      hasConnector={props.hasConnector}
      conversationId={conversation.id}
      kind={kind}
      runtimeConfigured={props.runtimeConfigured}
      skills={props.skills}
      stream={stream}
    />
  );

  return (
    <main className="flex h-[calc(100svh-var(--header-height))] flex-col overflow-hidden bg-background">
      <WorkspaceHeaderContent>
        <ConversationHeader
          agent={agent}
          backHref={backHref}
          conversation={conversation}
          kind={kind}
          onOpenPlan={openPlan}
          plan={props.plan}
          project={project}
          projects={props.projects}
        />
      </WorkspaceHeaderContent>

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
              style={{ overflow: "hidden" }}
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
              style={{ overflow: "hidden" }}
            >
              {renderDetailsPanel(true)}
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <div className="flex h-full min-h-0 min-w-0 flex-col">
            {transcript}
            <MobileDetailsDisclosure
              isOpen={isMobileDetailsOpen}
              onOpenChange={setIsMobileDetailsOpen}
            >
              {renderDetailsPanel(false)}
            </MobileDetailsDisclosure>
            {composer}
          </div>
        )}
      </section>
    </main>
  );
}
