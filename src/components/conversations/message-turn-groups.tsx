"use client";

import { RiAlertLine, RiArrowDownSLine } from "@remixicon/react";
import { cn } from "cn";
import { useState } from "react";

import { AssistantMessage } from "@/components/conversations/assistant-message";
import { MessageAppear } from "@/components/conversations/message-appear";
import { UserMessage } from "@/components/conversations/user-message";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import type {
  MessageSendOptions,
  PersistedActivity,
  PersistedMessage,
} from "./conversation-types";

export interface RenderMessageOptions {
  activities: PersistedActivity[];
  conversationId: string;
  copiedId?: string;
  copy: (id: string, content: string) => void;
  isLoading: boolean;
  lastMessageId?: string;
  pendingPrompt?: string;
  onAnswer: (text: string) => void;
  onEditMessage: (
    messageId: string,
    content: string,
    options: MessageSendOptions,
  ) => void;
  onRegenerate: (messageId: string) => void;
  onContinue: (messageId: string) => void;
}

function renderMessage(
  message: PersistedMessage,
  options: RenderMessageOptions,
) {
  if (message.role === "user") {
    return (
      <UserMessage
        attachments={message.attachments}
        content={message.content}
        conversationId={options.conversationId}
        id={message.id}
        isLoading={options.isLoading}
        key={message.id}
        onEdit={options.onEditMessage}
      />
    );
  }
  const isLast = message.id === options.lastMessageId && !options.pendingPrompt;
  return (
    <AssistantMessage
      activities={options.activities.filter(
        (activity) => activity.conversationMessageId === message.id,
      )}
      canContinue={isLast && Boolean(message.isPartial)}
      canRegenerate={isLast && !message.isPartial}
      copiedId={options.copiedId}
      isLoading={options.isLoading}
      key={message.id}
      message={message}
      onAnswer={options.onAnswer}
      onContinue={options.onContinue}
      onCopy={options.copy}
      onRegenerate={options.onRegenerate}
    />
  );
}

interface Turn {
  user: PersistedMessage;
  worker?: PersistedMessage;
}

export type DisplayGroup =
  { kind: "turn"; turn: Turn } | { kind: "failed-retries"; turns: Turn[] };

function pairMessagesIntoTurns(messages: PersistedMessage[]): Turn[] {
  const turns: Turn[] = [];
  for (const [index, message] of messages.entries()) {
    if (message.role !== "user") continue;
    const next: PersistedMessage | undefined = messages[index + 1];
    turns.push({
      user: message,
      worker: next && next.role !== "user" ? next : undefined,
    });
  }
  return turns;
}

function isRepeatedFailure(previousTurn: Turn, turn: Turn) {
  const isPreviousFailed = Boolean(previousTurn.worker?.isError);
  const isCurrentFailed = Boolean(turn.worker?.isError);
  return (
    isPreviousFailed &&
    isCurrentFailed &&
    previousTurn.user.content === turn.user.content
  );
}

function turnsOfGroup(group: DisplayGroup): Turn[] {
  if (group.kind === "failed-retries") return group.turns;
  return [group.turn];
}

/**
 * Pairs each user message with the worker reply that follows it, then
 * collapses consecutive turns that repeat the same prompt and all failed —
 * the retry-after-failure case — into one group, so a flaky run doesn't
 * paint N identical "Response failed" cards down the transcript.
 */
export function groupMessagesForDisplay(
  messages: PersistedMessage[],
): DisplayGroup[] {
  const groups: DisplayGroup[] = [];
  for (const turn of pairMessagesIntoTurns(messages)) {
    const previous = groups.at(-1);
    const previousTurns = previous ? turnsOfGroup(previous) : [];
    const previousTurn = previousTurns.at(-1);
    if (previousTurn && isRepeatedFailure(previousTurn, turn)) {
      groups[groups.length - 1] = {
        kind: "failed-retries",
        turns: [...previousTurns, turn],
      };
      continue;
    }
    groups.push({ kind: "turn", turn });
  }
  return groups;
}

/**
 * A run of consecutive turns that repeat the same prompt and all failed.
 * Shows the prompt once, then a single collapsible summary instead of N
 * identical "Response failed" cards — expand to see the latest failure's
 * detail.
 */
function FailedRetryGroup({
  turns,
  options,
}: {
  turns: Turn[];
  options: RenderMessageOptions;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const lastTurn = turns.at(-1);
  if (!lastTurn) return null;

  return (
    <div>
      <UserMessage
        attachments={lastTurn.user.attachments}
        content={lastTurn.user.content}
        conversationId={options.conversationId}
        id={lastTurn.user.id}
        isLoading={options.isLoading}
        onEdit={options.onEditMessage}
      />
      <Collapsible onOpenChange={setIsExpanded} open={isExpanded}>
        <div className="mx-auto flex w-fit items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <RiAlertLine aria-hidden="true" className="size-4 shrink-0" />
          <span>
            Failed {turns.length} {turns.length === 1 ? "time" : "times"}
          </span>
          <CollapsibleTrigger className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium hover:bg-destructive/10">
            {isExpanded ? "Hide" : "Details"}
            <RiArrowDownSLine
              aria-hidden="true"
              className={cn(
                "size-3.5 transition-transform",
                isExpanded && "rotate-180",
              )}
            />
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="mt-2 text-sm text-muted-foreground">
          {lastTurn.worker?.content}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export function renderGroup(
  group: DisplayGroup,
  options: RenderMessageOptions,
) {
  if (group.kind === "failed-retries") {
    return (
      <MessageAppear
        key={group.turns.at(-1)?.worker?.id ?? group.turns.at(0)?.user.id}
      >
        <FailedRetryGroup options={options} turns={group.turns} />
      </MessageAppear>
    );
  }
  const { turn } = group;
  return (
    <MessageAppear key={turn.user.id}>
      <div className="flex flex-col gap-8">
        {renderMessage(turn.user, options)}
        {turn.worker ? renderMessage(turn.worker, options) : null}
      </div>
    </MessageAppear>
  );
}
