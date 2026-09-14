"use client";

import { Bot, Check, Copy } from "lucide-react";
import { useCallback, useState } from "react";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import { LiveConversationActivity } from "@/components/conversations/live-conversation-activity";
import { QuestionOptions } from "@/components/conversations/question-options";
import { SourceList } from "@/components/conversations/source-list";

import type { PersistedActivity, PersistedMessage } from "./conversation-types";
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

function AssistantMessage({
  message,
  isLoading,
  onAnswer,
  copiedId,
  onCopy,
}: {
  message: PersistedMessage;
  isLoading: boolean;
  onAnswer: (text: string) => void;
  copiedId?: string;
  onCopy: (id: string, content: string) => void;
}) {
  const isCopied = copiedId === message.id;
  return (
    <Message from="assistant">
      <MessageContent>
        <MessageResponse>{message.content}</MessageResponse>
        {message.sources?.length ? (
          <SourceList sources={message.sources} />
        ) : null}
        {message.userQuestionOptions?.length ? (
          <QuestionOptions
            disabled={isLoading}
            mode={message.userQuestionSelectionMode ?? "single_select"}
            onAnswer={onAnswer}
            options={message.userQuestionOptions}
          />
        ) : null}
      </MessageContent>
      <MessageActions className="opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        <MessageAction
          aria-pressed={isCopied}
          label={isCopied ? "Copied" : "Copy message"}
          onClick={() => {
            onCopy(message.id, message.content);
          }}
          tooltip={isCopied ? "Copied" : "Copy"}
        >
          {isCopied ? (
            <Check aria-hidden="true" className="size-3.5" />
          ) : (
            <Copy aria-hidden="true" className="size-3.5" />
          )}
        </MessageAction>
      </MessageActions>
    </Message>
  );
}

function UserMessage({ content }: { content: string }) {
  return (
    <Message from="user">
      <MessageContent>
        <p className="whitespace-pre-wrap">{content}</p>
      </MessageContent>
    </Message>
  );
}

interface MessageListProps {
  agentName: string;
  messages: PersistedMessage[];
  transientTurns: TransientTurn[];
  pendingPrompt?: string;
  completion: string;
  isLoading: boolean;
  streamActivities: PersistedActivity[];
  onAnswer: (text: string) => void;
}

/**
 * The transcript: persisted messages, then turns finished in this session
 * that the server has not been re-fetched for, then the streaming turn.
 */
export function MessageList({
  agentName,
  messages,
  transientTurns,
  pendingPrompt,
  completion,
  isLoading,
  streamActivities,
  onAnswer,
}: MessageListProps) {
  const { copiedId, copy } = useCopyMessage();
  const isEmpty =
    messages.length === 0 && transientTurns.length === 0 && !pendingPrompt;

  return (
    <Conversation className="min-h-0 min-w-0 flex-1">
      <ConversationContent className="mx-auto w-full max-w-3xl gap-8 px-5 py-8 sm:px-8 sm:py-12">
        {isEmpty ? (
          <ConversationEmptyState
            className="min-h-[min(52svh,34rem)]"
            description={`Start with a clear objective, context, or question for ${agentName}.`}
            icon={<Bot className="size-7" aria-hidden="true" />}
            title={`How can ${agentName} help?`}
          />
        ) : null}
        {messages.map((message) =>
          message.role === "user" ? (
            <UserMessage content={message.content} key={message.id} />
          ) : (
            <AssistantMessage
              copiedId={copiedId}
              isLoading={isLoading}
              key={message.id}
              message={message}
              onAnswer={onAnswer}
              onCopy={(id, content) => void copy(id, content)}
            />
          ),
        )}
        {transientTurns.map((turn) => (
          <div key={turn.id}>
            <UserMessage content={turn.prompt} />
            {turn.completion ? (
              <Message from="assistant">
                <MessageContent>
                  <MessageResponse>{turn.completion}</MessageResponse>
                </MessageContent>
              </Message>
            ) : null}
          </div>
        ))}
        {pendingPrompt ? (
          <>
            <UserMessage content={pendingPrompt} />
            <Message from="assistant">
              <MessageContent>
                {completion ? (
                  <MessageResponse>{completion}</MessageResponse>
                ) : null}
                {isLoading ? (
                  <LiveConversationActivity events={streamActivities} />
                ) : null}
              </MessageContent>
            </Message>
          </>
        ) : null}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}
