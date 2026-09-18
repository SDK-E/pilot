"use client";

import { AnimatePresence } from "motion/react";
import { useCallback, useState } from "react";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import { TransientTurnReply } from "@/components/conversations/assistant-message";
import { LiveConversationActivity } from "@/components/conversations/live-conversation-activity";
import { MessageAppear } from "@/components/conversations/message-appear";
import {
  MESSAGE_RESPONSE_COMPONENTS,
  MESSAGE_RESPONSE_CONTROLS,
} from "@/components/conversations/message-response-controls";
import {
  groupMessagesForDisplay,
  renderGroup,
} from "@/components/conversations/message-turn-groups";
import { StreamingCursor } from "@/components/conversations/streaming-cursor";
import { UserMessage } from "@/components/conversations/user-message";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

import type {
  MessageSendOptions,
  PersistedActivity,
  PersistedMessage,
} from "./conversation-types";
import type { TransientTurn } from "./use-conversation-stream";

const COPIED_RESET_MS = 2000;

function useCopyMessage() {
  const [copiedId, setCopiedId] = useState<string>();
  const copy = useCallback(async (id: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => {
        setCopiedId((current) => (current === id ? undefined : current));
      }, COPIED_RESET_MS);
    } catch {
      // Clipboard access can be unavailable in an embedded browser.
    }
  }, []);
  return { copiedId, copy };
}

function isTranscriptEmpty(input: {
  messages: PersistedMessage[];
  transientTurns: TransientTurn[];
  pendingPrompt?: string;
  isLoading: boolean;
}) {
  if (input.isLoading || input.pendingPrompt) return false;
  return input.messages.length === 0 && input.transientTurns.length === 0;
}

function StreamingReply({
  completion,
  isLoading,
  isDetailsPanelVisible,
  streamActivities,
}: {
  completion: string;
  isLoading: boolean;
  isDetailsPanelVisible: boolean;
  streamActivities: PersistedActivity[];
}) {
  return (
    <Message from="assistant">
      <MessageContent>
        {completion ? (
          <span className="inline">
            <MessageResponse
              components={MESSAGE_RESPONSE_COMPONENTS}
              controls={MESSAGE_RESPONSE_CONTROLS}
            >
              {completion}
            </MessageResponse>
            {isLoading ? <StreamingCursor /> : null}
          </span>
        ) : null}
        {isLoading ? (
          <LiveConversationActivity
            events={streamActivities}
            isCompact={isDetailsPanelVisible}
          />
        ) : null}
      </MessageContent>
    </Message>
  );
}

interface MessageListProps {
  agentName: string;
  conversationId: string;
  messages: PersistedMessage[];
  activities: PersistedActivity[];
  transientTurns: TransientTurn[];
  pendingPrompt?: string;
  completion: string;
  isLoading: boolean;
  isBackgroundRunning: boolean;
  isDetailsPanelVisible: boolean;
  streamActivities: PersistedActivity[];
  onAnswer: (text: string) => void;
  onEditMessage: (
    messageId: string,
    content: string,
    options: MessageSendOptions,
  ) => void;
  onRegenerate: (messageId: string) => void;
  onContinue: (messageId: string) => void;
}

/**
 * The transcript: persisted messages, then turns finished in this session
 * that the server has not been re-fetched for, then the streaming turn. Only
 * the last assistant reply can be regenerated — editing a user message and
 * resending is the general way to revise anything earlier.
 */
export function MessageList({
  agentName,
  conversationId,
  messages,
  activities,
  transientTurns,
  pendingPrompt,
  completion,
  isLoading,
  isBackgroundRunning,
  isDetailsPanelVisible,
  streamActivities,
  onAnswer,
  onEditMessage,
  onRegenerate,
  onContinue,
}: MessageListProps) {
  const { copiedId, copy } = useCopyMessage();
  const isEmpty = isTranscriptEmpty({
    isLoading,
    messages,
    pendingPrompt,
    transientTurns,
  });
  const lastMessageId = messages.at(-1)?.id;

  return (
    <Conversation className="min-h-0 min-w-0 flex-1">
      <ConversationContent className="mx-auto w-full max-w-3xl gap-8 px-5 py-8 sm:px-8 sm:py-12">
        {isEmpty ? (
          <Empty className="min-h-[min(52svh,34rem)] border-none">
            <EmptyHeader>
              <EmptyTitle>{`How can ${agentName} help?`}</EmptyTitle>
              <EmptyDescription>
                {`Start with a clear objective, context, or question for ${agentName}.`}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : null}
        <AnimatePresence initial={false}>
          {groupMessagesForDisplay(messages).map((group) =>
            renderGroup(group, {
              activities,
              conversationId,
              copiedId,
              copy: (id, content) => void copy(id, content),
              isBackgroundRunning,
              isLoading,
              lastMessageId,
              onAnswer,
              onContinue,
              onEditMessage,
              onRegenerate,
              pendingPrompt,
            }),
          )}
          {transientTurns.map((turn) => (
            <MessageAppear key={turn.id}>
              <div className="flex flex-col gap-8">
                <UserMessage content={turn.prompt} />
                <TransientTurnReply turn={turn} />
              </div>
            </MessageAppear>
          ))}
          {pendingPrompt ? (
            <MessageAppear key="pending-prompt">
              <UserMessage content={pendingPrompt} />
            </MessageAppear>
          ) : null}
          {isLoading || pendingPrompt ? (
            <MessageAppear key="streaming-reply">
              <StreamingReply
                completion={completion}
                isDetailsPanelVisible={isDetailsPanelVisible}
                isLoading={isLoading}
                streamActivities={streamActivities}
              />
            </MessageAppear>
          ) : null}
        </AnimatePresence>
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}
