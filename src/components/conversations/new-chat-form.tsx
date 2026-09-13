"use client";

import { startTransition, useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bot, Globe2 } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { useSendMessageShortcut } from "@/components/conversations/composer-preferences";
import { shouldSubmitMessage } from "@/hooks/use-message-submit-shortcut";

type AgentOption = {
  id: string;
  name: string;
  baseAgentId: string;
};

const promptSuggestions = [
  "Help me plan a project",
  "Research a topic with sources",
  "Draft something with me",
] as const;

export function NewChatForm({
  agents,
  defaultAgentId,
  mode,
}: {
  agents: AgentOption[];
  defaultAgentId: string | null;
  mode?: string;
}) {
  const router = useRouter();
  const sendMessageShortcut = useSendMessageShortcut();
  const textareaId = useId();
  const fieldErrorId = useId();
  const [selectedAgentId, setSelectedAgentId] = useState<string | undefined>(
    defaultAgentId && agents.some((agent) => agent.id === defaultAgentId)
      ? defaultAgentId
      : agents[0]?.id,
  );
  const [input, setInput] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string>();
  const selectedAgent = agents.find((agent) => agent.id === selectedAgentId);

  useEffect(() => {
    const templates: Record<string, string> = {
      plan: "Help me plan: ",
      draft: "Help me draft: ",
      research: "Research: ",
    };
    if (mode && templates[mode])
      startTransition(() => setInput(templates[mode]));
  }, [mode]);

  const focusComposer = () => document.getElementById(textareaId)?.focus();
  const startConversation = async (raw: string) => {
    const prompt = raw.trim();
    if (!prompt) {
      setError("Message cannot be blank.");
      focusComposer();
      return;
    }
    if (isStarting) return;
    setIsStarting(true);
    setError(undefined);
    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt, workerId: selectedAgentId ?? "" }),
      });
      const payload: {
        conversationId?: string;
        href?: string;
        error?: string;
      } = await response.json();
      if (!response.ok || !payload.conversationId || !payload.href)
        throw new Error(payload.error || "Pilot could not start a chat.");
      sessionStorage.setItem(
        `pilot:initial-message:${payload.conversationId}`,
        prompt,
      );
      router.push(payload.href);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Pilot could not start a chat.",
      );
      setIsStarting(false);
    }
  };
  if (agents.length === 0)
    return (
      <section className="rounded-3xl border border-dashed border-border bg-card p-8 text-center shadow-sm">
        <Bot className="mx-auto size-5 text-primary" aria-hidden="true" />
        <h2 className="mt-4 font-medium">Create a persona to begin</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Personas set an agent’s goals, instructions, and available tools.
        </p>
        <Button asChild className="mt-5">
          <Link href="/workspace/personas">Create persona</Link>
        </Button>
      </section>
    );
  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 text-left">
      <PromptInput
        className="rounded-3xl border-border bg-card p-2 shadow-xl shadow-foreground/[0.04]"
        onSubmit={(message: PromptInputMessage) =>
          void startConversation(message.text ?? "")
        }
      >
        <PromptInputBody>
          <PromptInputTextarea
            aria-describedby={error ? fieldErrorId : undefined}
            aria-invalid={error ? true : undefined}
            aria-label="Message Pilot"
            className="min-h-32 px-3 pt-3 text-[15px] leading-6"
            disabled={isStarting}
            id={textareaId}
            maxLength={10_000}
            onChange={(event) => {
              setInput(event.currentTarget.value);
              if (error) setError(undefined);
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter" || event.nativeEvent.isComposing)
                return;
              if (shouldSubmitMessage(event, sendMessageShortcut)) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder="Message Pilot…"
            required
            rows={3}
            value={input}
          />
        </PromptInputBody>
        <PromptInputFooter className="px-2 pb-1">
          <PromptInputTools>
            <PromptInputSelect
              onValueChange={setSelectedAgentId}
              value={selectedAgentId}
            >
              <PromptInputSelectTrigger className="h-8 max-w-52 rounded-full border-0 bg-muted px-2.5 text-xs shadow-none">
                <AgentAvatar
                  className="size-4"
                  name={selectedAgent?.name ?? "Pilot"}
                />
                <PromptInputSelectValue placeholder="Choose a persona" />
              </PromptInputSelectTrigger>
              <PromptInputSelectContent>
                {agents.map((agent) => (
                  <PromptInputSelectItem key={agent.id} value={agent.id}>
                    {agent.name}
                  </PromptInputSelectItem>
                ))}
              </PromptInputSelectContent>
            </PromptInputSelect>
            <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:inline-flex">
              <Globe2 className="size-3.5" aria-hidden="true" />
              Web ready
            </span>
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
          className="px-2 text-sm text-destructive"
          id={fieldErrorId}
          role="alert"
        >
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap justify-center gap-2 px-1">
        {promptSuggestions.map((suggestion) => (
          <Button
            className="rounded-full bg-muted px-3 text-xs font-normal text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            key={suggestion}
            onClick={() => setInput(suggestion)}
            type="button"
            variant="ghost"
          >
            {suggestion}
          </Button>
        ))}
      </div>
    </div>
  );
}
