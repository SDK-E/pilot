"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState, type RefObject } from "react";

import { AGENT_KINDS, type AgentKindId } from "@/agents/agent-kinds";
import { AgentAvatar } from "@/components/agents/agent-avatar";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { useSendMessageShortcut } from "@/components/conversations/composer-preferences";
import {
  startConversationRequest,
  startFailureMessage,
} from "@/components/conversations/start-conversation-request";
import { Button } from "@/components/ui/button";
import { submitOnShortcut } from "@/hooks/use-message-submit-shortcut";

interface AgentOption {
  id: string;
  name: string;
}

/**
 * The organization's default agent when it belongs to this mode, otherwise
 * the first agent listed.
 */
function initialAgentId(agents: AgentOption[], defaultAgentId: string | null) {
  const preferred = agents.find((agent) => agent.id === defaultAgentId);
  return (preferred ?? agents[0])?.id;
}

/**
 * Starts the conversation for the first message and navigates to it. The
 * form stays disabled after success because the page is about to change.
 */
function useStartConversation({
  kind,
  agentId,
  textareaRef,
}: {
  kind: AgentKindId;
  agentId: string | undefined;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}) {
  const router = useRouter();
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string>();

  const start = async (raw: string) => {
    const prompt = raw.trim();
    if (!prompt) {
      setError("Message cannot be blank.");
      textareaRef.current?.focus();
      return;
    }
    if (isStarting) return;
    setIsStarting(true);
    setError(undefined);
    try {
      router.push(await startConversationRequest({ kind, prompt, agentId }));
    } catch (error_) {
      setError(startFailureMessage(error_));
      setIsStarting(false);
    }
  };

  return {
    start,
    error,
    isStarting,
    clearError: () => {
      setError(undefined);
    },
  };
}

/**
 * Only worth choosing between when there's more than one agent to pick;
 * a single agent shows as a plain label, and zero agents show nothing.
 */
function AgentPicker({
  agents,
  agentId,
  agentName,
  defaultAgentName,
  onAgentChange,
}: {
  agents: AgentOption[];
  agentId: string | undefined;
  agentName: string;
  defaultAgentName: string;
  onAgentChange: (agentId: string) => void;
}) {
  if (agents.length > 1) {
    return (
      <PromptInputSelect onValueChange={onAgentChange} value={agentId}>
        <PromptInputSelectTrigger className="h-8 max-w-52 rounded-full border-0 bg-muted px-2.5 text-xs shadow-none">
          <AgentAvatar className="size-4" name={agentName} />
          <PromptInputSelectValue placeholder={defaultAgentName} />
        </PromptInputSelectTrigger>
        <PromptInputSelectContent>
          {agents.map((agent) => (
            <PromptInputSelectItem key={agent.id} value={agent.id}>
              {agent.name}
            </PromptInputSelectItem>
          ))}
        </PromptInputSelectContent>
      </PromptInputSelect>
    );
  }
  if (agents.length === 1) {
    return (
      <span className="inline-flex h-8 max-w-52 items-center gap-1.5 rounded-full bg-muted px-2.5 text-xs text-muted-foreground">
        <AgentAvatar className="size-4" name={agentName} />
        <span className="truncate">{agentName}</span>
      </span>
    );
  }
  return null;
}

function SuggestionChips({
  suggestions,
  onPick,
}: {
  suggestions: readonly string[];
  onPick: (suggestion: string) => void;
}) {
  return (
    <div className="flex flex-wrap justify-center gap-2 px-1">
      {suggestions.map((suggestion) => (
        <Button
          className="rounded-full bg-muted px-3 text-xs font-normal text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          key={suggestion}
          onClick={() => {
            onPick(suggestion);
          }}
          type="button"
          variant="ghost"
        >
          {suggestion}
        </Button>
      ))}
    </div>
  );
}

/**
 * The start screen composer. Creates the conversation, then opens it with
 * the first message queued so the conversation page streams it.
 */
export function NewConversationForm({
  kind,
  agents,
  defaultAgentId,
}: {
  kind: AgentKindId;
  agents: AgentOption[];
  defaultAgentId: string | null;
}) {
  const sendMessageShortcut = useSendMessageShortcut();
  const textareaId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const errorId = useId();
  const [agentId, setAgentId] = useState(
    initialAgentId(agents, defaultAgentId),
  );
  const [input, setInput] = useState("");
  const { placeholder, suggestions, defaultAgent } = AGENT_KINDS[kind];
  const agentName =
    agents.find((agent) => agent.id === agentId)?.name ?? defaultAgent.name;
  const { start, error, clearError, isStarting } = useStartConversation({
    kind,
    agentId,
    textareaRef,
  });

  return (
    <div className="space-y-4">
      <PromptInput
        className="rounded-xl border bg-card p-2 shadow-sm"
        onSubmit={(message: PromptInputMessage) => void start(message.text)}
      >
        <PromptInputBody>
          <PromptInputTextarea
            aria-describedby={error ? errorId : undefined}
            aria-invalid={error ? true : undefined}
            aria-label={`Message ${agentName}`}
            className="min-h-32 px-3 pt-3 text-sm leading-6"
            disabled={isStarting}
            id={textareaId}
            ref={textareaRef}
            maxLength={10_000}
            onChange={(event) => {
              setInput(event.currentTarget.value);
              if (error) clearError();
            }}
            onKeyDown={(event) => submitOnShortcut(event, sendMessageShortcut)}
            placeholder={placeholder}
            required
            rows={3}
            value={input}
          />
        </PromptInputBody>
        <PromptInputFooter className="px-2 pb-1">
          <PromptInputTools>
            <AgentPicker
              agentId={agentId}
              agentName={agentName}
              agents={agents}
              defaultAgentName={defaultAgent.name}
              onAgentChange={setAgentId}
            />
          </PromptInputTools>
          <PromptInputSubmit
            disabled={!input.trim() && !isStarting}
            status={isStarting ? "submitted" : "ready"}
          />
        </PromptInputFooter>
      </PromptInput>
      {error ? (
        <p
          aria-live="assertive"
          className="px-2 text-xs text-destructive"
          id={errorId}
          role="alert"
        >
          {error}
        </p>
      ) : null}
      <SuggestionChips onPick={setInput} suggestions={suggestions} />
    </div>
  );
}
