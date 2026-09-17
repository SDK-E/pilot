"use client";

import {
  RiCheckLine,
  RiFileCopyLine,
  RiPlayLine,
  RiRefreshLine,
} from "@remixicon/react";

import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import { MessageActivityTrace } from "@/components/conversations/message-activity-trace";
import {
  MESSAGE_RESPONSE_COMPONENTS,
  MESSAGE_RESPONSE_CONTROLS,
} from "@/components/conversations/message-response-controls";
import { QuestionOptions } from "@/components/conversations/question-options";
import { SourceList } from "@/components/conversations/source-list";

import type { PersistedActivity, PersistedMessage } from "./conversation-types";
import type { TransientTurn } from "./use-conversation-stream";

const ERROR_CONTENT_CLASSNAME =
  "rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-destructive";

function assistantContentClassName(isError?: boolean) {
  return isError ? ERROR_CONTENT_CLASSNAME : undefined;
}

function AssistantMessageBody({ message }: { message: PersistedMessage }) {
  if (message.isError) return <p>{message.content}</p>;
  return (
    <MessageResponse
      components={MESSAGE_RESPONSE_COMPONENTS}
      controls={MESSAGE_RESPONSE_CONTROLS}
    >
      {message.content}
    </MessageResponse>
  );
}

function CopyMessageAction({
  isCopied,
  onClick,
}: {
  isCopied: boolean;
  onClick: () => void;
}) {
  const label = isCopied ? "Copied" : "Copy message";
  return (
    <MessageAction
      aria-pressed={isCopied}
      className="transition-transform active:scale-90"
      label={label}
      onClick={onClick}
      tooltip={isCopied ? "Copied" : "Copy"}
    >
      {isCopied ? (
        <RiCheckLine aria-hidden="true" />
      ) : (
        <RiFileCopyLine aria-hidden="true" />
      )}
    </MessageAction>
  );
}

export function AssistantMessage({
  message,
  isLoading,
  onAnswer,
  copiedId,
  onCopy,
  activities,
  canRegenerate,
  onRegenerate,
  canContinue,
  onContinue,
}: {
  message: PersistedMessage;
  isLoading: boolean;
  onAnswer: (text: string) => void;
  copiedId?: string;
  onCopy: (id: string, content: string) => void;
  activities: PersistedActivity[];
  canRegenerate: boolean;
  onRegenerate: (messageId: string) => void;
  canContinue: boolean;
  onContinue: (messageId: string) => void;
}) {
  const isCopied = copiedId === message.id;
  return (
    <Message from="assistant">
      <MessageContent className={assistantContentClassName(message.isError)}>
        {activities.length > 0 ? (
          <MessageActivityTrace events={activities} />
        ) : null}
        <AssistantMessageBody message={message} />
        {message.isPartial ? (
          <p className="text-xs text-muted-foreground">
            Stopped before finishing.
          </p>
        ) : null}
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
        <CopyMessageAction
          isCopied={isCopied}
          onClick={() => {
            onCopy(message.id, message.content);
          }}
        />
        {canContinue ? (
          <MessageAction
            className="transition-transform active:scale-90"
            disabled={isLoading}
            label="Continue response"
            onClick={() => {
              onContinue(message.id);
            }}
            tooltip="Continue"
          >
            <RiPlayLine aria-hidden="true" />
          </MessageAction>
        ) : null}
        {canRegenerate ? (
          <MessageAction
            className="transition-transform active:scale-90"
            disabled={isLoading}
            label="Regenerate response"
            onClick={() => {
              onRegenerate(message.id);
            }}
            tooltip="Regenerate"
          >
            <RiRefreshLine aria-hidden="true" />
          </MessageAction>
        ) : null}
      </MessageActions>
    </Message>
  );
}

export function TransientTurnReply({ turn }: { turn: TransientTurn }) {
  if (turn.completion) {
    return (
      <Message from="assistant">
        <MessageContent>
          <MessageResponse
            components={MESSAGE_RESPONSE_COMPONENTS}
            controls={MESSAGE_RESPONSE_CONTROLS}
          >
            {turn.completion}
          </MessageResponse>
        </MessageContent>
      </Message>
    );
  }
  if (turn.error) {
    return (
      <Message from="assistant">
        <MessageContent className={ERROR_CONTENT_CLASSNAME}>
          <p>{turn.error}</p>
        </MessageContent>
      </Message>
    );
  }
  return null;
}
