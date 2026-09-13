"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  startTransition,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { useCompletion } from "@ai-sdk/react";
import {
  ArrowLeft,
  Bot,
  Check,
  Copy,
  Paperclip,
  SendHorizontal,
  Square,
} from "lucide-react";
import { AgentAvatar } from "@/components/agents/agent-avatar";
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
import { ConversationDetailsPanel } from "@/components/conversations/conversation-details-panel";
import { DeleteAttachmentButton } from "@/components/conversations/delete-attachment-button";
import { ConversationProjectPicker } from "@/components/conversations/conversation-project-picker";
import { DeleteConversationButton } from "@/components/conversations/delete-conversation-button";
import { RenameConversationForm } from "@/components/conversations/rename-conversation-form";
import { useSendMessageShortcut } from "@/components/conversations/composer-preferences";
import { LiveConversationActivity } from "@/components/conversations/live-conversation-activity";
import type { ActivityEventType } from "@/executions/activity-event";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { shouldSubmitMessage } from "@/hooks/use-message-submit-shortcut";

type PersistedMessage = {
  id: string;
  role: "user" | "worker";
  content: string;
  userQuestionOptions?: Array<{ label: string; description?: string }> | null;
  userQuestionSelectionMode?: "single_select" | "multi_select" | null;
};

type TransientTurn = {
  id: string;
  prompt: string;
  completion: string;
};

type PersistedActivity = {
  id: string;
  conversationMessageId: string | null;
  summary: string;
  type: ActivityEventType;
};

type ConversationShellProps = {
  backHref: string;
  conversationId: string;
  messages: PersistedMessage[];
  activities: PersistedActivity[];
  runtimeConfigured: boolean;
  conversationTitle: string;
  agentId: string;
  agentName: string;
  tasks: Array<{ id: string; title: string; status: string }>;
  approvals: Array<{ id: string; summary: string; status: string }>;
  project?: {
    id: string;
    name: string;
    sharedMemoryEnabled: boolean;
  };
  projects: Array<{ id: string; name: string }>;
  attachments: Array<{
    id: string;
    filename: string;
    contentType: string;
    byteSize: number;
  }>;
  scratchpad: string;
};

export function ConversationShell({
  backHref,
  conversationId,
  messages,
  activities,
  runtimeConfigured,
  conversationTitle,
  agentId,
  agentName,
  tasks,
  approvals,
  project,
  projects,
  attachments,
  scratchpad,
}: ConversationShellProps) {
  const router = useRouter();
  const sendMessageShortcut = useSendMessageShortcut();
  const [pendingUserMessage, setPendingUserMessage] = useState<string>();
  const [freshMessages, setFreshMessages] = useState<PersistedMessage[] | null>(
    null,
  );
  const [transientTurns, setTransientTurns] = useState<TransientTurn[]>([]);
  const [selectedQuestionOptions, setSelectedQuestionOptions] = useState<
    Record<string, string[]>
  >({});
  const [liveActivities, setLiveActivities] = useState(activities);
  const [attachmentError, setAttachmentError] = useState<string>();
  const [uploading, setUploading] = useState(false);
  const [streamError, setStreamError] = useState<string>();
  const [timeoutError, setTimeoutError] = useState<string>();
  const [validationError, setValidationError] = useState<string>();
  const [copiedMessageId, setCopiedMessageId] = useState<string>();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastSubmittedMessageRef = useRef<string | undefined>(undefined);
  const fieldErrorId = useId();
  const timedOutRef = useRef(false);
  const displayedMessages = freshMessages ?? messages;
  const displayedActivities = useMemo(() => {
    const byId = new Map(activities.map((activity) => [activity.id, activity]));
    for (const activity of liveActivities) byId.set(activity.id, activity);
    return [...byId.values()];
  }, [activities, liveActivities]);
  const syncMessages = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/conversations/${conversationId}/messages?workerId=${agentId}`,
        { cache: "no-store" },
      );
      if (!response.ok) return;
      const payload: { messages?: PersistedMessage[] } = await response.json();
      if (payload.messages) {
        setFreshMessages(payload.messages);
        setTransientTurns([]);
      }
    } catch {
      // The streaming turn remains visible locally until the next visit.
    }
  }, [agentId, conversationId]);
  const keepTransientTurn = useCallback((prompt: string, text: string) => {
    setTransientTurns((current) => [
      ...current,
      { id: `${Date.now()}-${current.length}`, prompt, completion: text },
    ]);
  }, []);
  const {
    complete,
    completion,
    error,
    input,
    isLoading,
    setCompletion,
    setInput,
    stop,
  } = useCompletion<{ workerId: string }>({
    api: `/api/conversations/${conversationId}/stream`,
    body: { workerId: agentId },
    experimental_throttle: 50,
    streamProtocol: "text",
    onError: (cause) => {
      const prompt = lastSubmittedMessageRef.current;
      if (prompt) keepTransientTurn(prompt, "");
      setPendingUserMessage(undefined);
      setStreamError(
        cause instanceof Error
          ? cause.message
          : "Pilot could not complete this message.",
      );
      setTimeoutError(undefined);
      void syncMessages();
    },
    onFinish: (prompt, finalCompletion) => {
      keepTransientTurn(prompt, finalCompletion);
      setCompletion("");
      setPendingUserMessage(undefined);
      setTimeoutError(undefined);
      void syncMessages();
    },
  });
  const handleTaskCreated = useCallback(() => router.refresh(), [router]);
  const submitText = useCallback(
    (rawMessage: string) => {
      const message = rawMessage.trim();
      if (!message || isLoading) return;
      lastSubmittedMessageRef.current = message;
      setPendingUserMessage(message);
      setCompletion("");
      setInput("");
      setStreamError(undefined);
      setTimeoutError(undefined);
      void complete(message);
    },
    [complete, isLoading, setCompletion, setInput],
  );
  useEffect(() => {
    const key = `pilot:initial-message:${conversationId}`;
    const initialMessage = sessionStorage.getItem(key);
    if (!initialMessage) return;
    sessionStorage.removeItem(key);
    startTransition(() => submitText(initialMessage));
  }, [conversationId, submitText]);

  const submitMessage = useCallback(() => {
    const raw = input;
    if (!raw.trim()) {
      setValidationError("Message cannot be blank.");
      textareaRef.current?.focus();
      return;
    }
    const message = raw.trim();
    if (isLoading) return;
    setValidationError(undefined);
    submitText(message);
  }, [input, isLoading, submitText]);
  const restoreLastMessage = useCallback(() => {
    setTimeoutError(undefined);
    setStreamError(undefined);
    setPendingUserMessage(undefined);
    setCompletion("");
    setInput(lastSubmittedMessageRef.current ?? "");
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, [setCompletion, setInput]);
  const cancel = useCallback(() => {
    stop();
    setTimeoutError(undefined);
    setPendingUserMessage(undefined);
    setCompletion("");
    setInput("");
  }, [setCompletion, setInput, stop]);
  const copyMessage = useCallback(
    async (messageId: string, content: string) => {
      try {
        await navigator.clipboard.writeText(content);
        setCopiedMessageId(messageId);
        window.setTimeout(() => {
          setCopiedMessageId((current) =>
            current === messageId ? undefined : current,
          );
        }, 2_000);
      } catch {
        // Clipboard access can be unavailable in an embedded or insecure browser.
      }
    },
    [],
  );
  const toggleQuestionOption = useCallback(
    (messageId: string, option: string) => {
      setSelectedQuestionOptions((current) => {
        const selected = current[messageId] ?? [];
        return {
          ...current,
          [messageId]: selected.includes(option)
            ? selected.filter((value) => value !== option)
            : [...selected, option],
        };
      });
    },
    [],
  );
  const uploadAttachment = useCallback(
    async (file: File) => {
      setUploading(true);
      setAttachmentError(undefined);
      try {
        const formData = new FormData();
        formData.set("workerId", agentId);
        formData.set("file", file);
        const result = await fetch(
          `/api/conversations/${conversationId}/attachments`,
          {
            method: "POST",
            body: formData,
          },
        );
        if (!result.ok) throw new Error("Pilot could not attach this file.");
        router.refresh();
      } catch (error) {
        setAttachmentError(
          error instanceof Error
            ? error.message
            : "Pilot could not attach this file.",
        );
      } finally {
        setUploading(false);
      }
    },
    [agentId, conversationId, router],
  );

  useEffect(() => {
    if (!isLoading) return;

    let cancelled = false;
    const refreshActivities = async () => {
      try {
        const response = await fetch(
          `/api/conversations/${conversationId}/activity`,
          { cache: "no-store" },
        );
        if (!response.ok || cancelled) return;
        const payload: { activities?: PersistedActivity[] } =
          await response.json();
        if (payload.activities && !cancelled) {
          setLiveActivities(payload.activities);
        }
      } catch {
        // The stream is still authoritative; activity polling is best effort.
      }
    };

    void refreshActivities();
    const interval = window.setInterval(() => void refreshActivities(), 1_000);
    const timeoutHandle = window.setTimeout(() => {
      timedOutRef.current = true;
      setTimeoutError(
        "The response timed out. The request may still have completed; review the message before sending it again.",
      );
      stop();
    }, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.clearTimeout(timeoutHandle);
    };
  }, [conversationId, isLoading, stop]);

  return (
    <main className="flex h-[calc(100svh-4rem)] flex-col overflow-hidden bg-background">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4 sm:px-6">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          <span className="hidden sm:inline">New chat</span>
        </Link>
        <div className="flex min-w-0 items-center gap-2 text-center">
          <AgentAvatar name={agentName} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{agentName}</p>
            <p className="truncate text-xs text-muted-foreground">Persona</p>
            {project ? (
              <Link
                className="block truncate text-xs text-primary hover:underline"
                href={`/workspace/projects/${project.id}`}
              >
                {project.name} ·{" "}
                {project.sharedMemoryEnabled
                  ? "Shared memory on"
                  : "Project context"}
              </Link>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <RenameConversationForm
            conversationId={conversationId}
            title={conversationTitle}
            workerId={agentId}
          />
          <DeleteConversationButton
            conversationId={conversationId}
            redirectHref="/workspace"
            workerId={agentId}
          />
          <ConversationProjectPicker
            conversationId={conversationId}
            currentProject={project}
            projects={projects}
          />
        </div>
      </header>

      <section className="flex min-h-0 flex-1 overflow-hidden flex-col lg:flex-row">
        <Conversation className="min-h-0 min-w-0 flex-1">
          <ConversationContent className="mx-auto w-full max-w-3xl gap-8 px-5 py-8 sm:px-8 sm:py-12">
            {displayedMessages.length === 0 &&
            transientTurns.length === 0 &&
            !pendingUserMessage ? (
              <ConversationEmptyState
                className="min-h-[min(52svh,34rem)]"
                description={`Start with a clear objective, context, or question for ${agentName}.`}
                icon={<Bot className="size-7" aria-hidden="true" />}
                title={`How can ${agentName} help?`}
              />
            ) : (
              displayedMessages.map((message) => {
                const from = message.role === "user" ? "user" : "assistant";

                return (
                  <Message from={from} key={message.id}>
                    <MessageContent>
                      {from === "assistant" ? (
                        <>
                          <MessageResponse>{message.content}</MessageResponse>
                          {message.userQuestionOptions?.length ? (
                            message.userQuestionSelectionMode ===
                            "multi_select" ? (
                              <fieldset
                                className="mt-3 space-y-2"
                                disabled={isLoading}
                              >
                                <legend className="text-xs text-muted-foreground">
                                  Select one or more answers, or write a reply.
                                </legend>
                                <div className="flex flex-wrap gap-2">
                                  {message.userQuestionOptions.map((option) => {
                                    const selected = (
                                      selectedQuestionOptions[message.id] ?? []
                                    ).includes(option.label);
                                    return (
                                      <label
                                        className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                                        key={option.label}
                                        title={option.description}
                                      >
                                        <input
                                          checked={selected}
                                          className="size-4 accent-primary"
                                          onChange={() =>
                                            toggleQuestionOption(
                                              message.id,
                                              option.label,
                                            )
                                          }
                                          type="checkbox"
                                        />
                                        {option.label}
                                      </label>
                                    );
                                  })}
                                </div>
                                <Button
                                  disabled={
                                    isLoading ||
                                    !(selectedQuestionOptions[message.id] ?? [])
                                      .length
                                  }
                                  onClick={() =>
                                    submitText(
                                      (
                                        selectedQuestionOptions[message.id] ??
                                        []
                                      ).join("\n"),
                                    )
                                  }
                                  size="sm"
                                  type="button"
                                >
                                  Submit selected answers
                                </Button>
                              </fieldset>
                            ) : (
                              <div
                                aria-label="Select an answer, or write a reply"
                                className="mt-3 flex flex-wrap gap-2"
                              >
                                {message.userQuestionOptions.map((option) => (
                                  <Button
                                    key={option.label}
                                    disabled={isLoading}
                                    onClick={() => submitText(option.label)}
                                    size="sm"
                                    title={option.description}
                                    type="button"
                                    variant="outline"
                                  >
                                    {option.label}
                                  </Button>
                                ))}
                              </div>
                            )
                          ) : null}
                        </>
                      ) : (
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      )}
                    </MessageContent>
                    <MessageActions className="opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                      <MessageAction
                        aria-pressed={copiedMessageId === message.id}
                        label={
                          copiedMessageId === message.id
                            ? "Copied"
                            : "Copy message"
                        }
                        onClick={() =>
                          void copyMessage(message.id, message.content)
                        }
                        tooltip={
                          copiedMessageId === message.id ? "Copied" : "Copy"
                        }
                      >
                        {copiedMessageId === message.id ? (
                          <Check aria-hidden="true" className="size-3.5" />
                        ) : (
                          <Copy aria-hidden="true" className="size-3.5" />
                        )}
                      </MessageAction>
                    </MessageActions>
                  </Message>
                );
              })
            )}
            {transientTurns.map((turn) => (
              <div key={turn.id}>
                <Message from="user">
                  <MessageContent>
                    <p className="whitespace-pre-wrap">{turn.prompt}</p>
                  </MessageContent>
                </Message>
                {turn.completion ? (
                  <Message from="assistant">
                    <MessageContent>
                      <MessageResponse>{turn.completion}</MessageResponse>
                    </MessageContent>
                  </Message>
                ) : null}
              </div>
            ))}
            {pendingUserMessage ? (
              <Message from="user">
                <MessageContent>
                  <p className="whitespace-pre-wrap">{pendingUserMessage}</p>
                </MessageContent>
              </Message>
            ) : null}
            {pendingUserMessage ? (
              <Message from="assistant">
                <MessageContent>
                  {completion ? (
                    <MessageResponse>{completion}</MessageResponse>
                  ) : null}
                  {isLoading ? (
                    <LiveConversationActivity events={displayedActivities} />
                  ) : null}
                </MessageContent>
              </Message>
            ) : null}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <ConversationDetailsPanel
          activities={displayedActivities}
          agentId={agentId}
          approvals={approvals}
          conversationId={conversationId}
          onTaskCreated={handleTaskCreated}
          tasks={tasks}
          scratchpad={scratchpad}
        />
      </section>

      <div className="shrink-0 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-xl sm:px-6 sm:pb-5 safe-bottom">
        <div className="mx-auto w-full max-w-3xl">
          {attachments.length ? (
            <ul
              className="mb-3 flex flex-wrap gap-2"
              aria-label="Chat attachments"
            >
              {attachments.map((attachment) => (
                <li
                  key={attachment.id}
                  className="flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1 text-xs"
                >
                  <a
                    className="max-w-48 truncate hover:underline"
                    href={`/api/attachments/${attachment.id}`}
                    target="_blank"
                    rel="noreferrer"
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
          ) : null}
          {runtimeConfigured ? (
            <form
              className="space-y-2"
              onSubmit={(event) => {
                event.preventDefault();
                submitMessage();
              }}
            >
              <div className="flex items-center gap-2 px-2 pt-2">
                <label className="inline-flex cursor-pointer items-center gap-1 rounded-full px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                  <Paperclip className="size-4" />{" "}
                  {uploading ? "Attaching…" : "Attach"}
                  <input
                    className="sr-only"
                    disabled={uploading || isLoading}
                    type="file"
                    accept=".pdf,.txt,.md,.csv,.docx,.xlsx,image/jpeg,image/png,image/webp"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void uploadAttachment(file);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
                {attachmentError ? (
                  <p aria-live="polite" className="text-xs text-destructive">
                    {attachmentError}
                  </p>
                ) : null}
              </div>
              <Textarea
                aria-describedby={
                  validationError ? `${fieldErrorId}` : undefined
                }
                aria-invalid={validationError ? true : undefined}
                aria-label="Message"
                className="composer-textarea min-h-28 resize-y rounded-[1.5rem] border-border bg-card px-4 py-3 shadow-xl shadow-foreground/[0.06] focus-visible:ring-2"
                id={fieldErrorId}
                maxLength={10_000}
                onChange={(event) => {
                  setInput(event.target.value);
                  if (validationError) setValidationError(undefined);
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" || event.nativeEvent.isComposing)
                    return;
                  if (shouldSubmitMessage(event, sendMessageShortcut)) {
                    event.preventDefault();
                    submitMessage();
                    return;
                  }
                  if (sendMessageShortcut === "mod_enter" && !event.shiftKey) {
                    event.preventDefault();
                    const textarea = event.currentTarget;
                    const next = `${textarea.value.slice(0, textarea.selectionStart)}\n${textarea.value.slice(textarea.selectionEnd)}`;
                    setInput(next);
                    requestAnimationFrame(() => {
                      const position = textarea.selectionStart + 1;
                      textarea.setSelectionRange(position, position);
                    });
                  }
                }}
                placeholder="Message Pilot…"
                ref={textareaRef}
                required
                rows={3}
                value={input}
              />
              {validationError ? (
                <p
                  aria-live="assertive"
                  className="text-sm text-destructive"
                  id={fieldErrorId}
                  role="alert"
                >
                  {validationError}
                </p>
              ) : null}
              {timeoutError ? (
                <div className="space-y-2">
                  <p
                    aria-live="assertive"
                    className="text-sm text-destructive"
                    role="alert"
                  >
                    {timeoutError}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={restoreLastMessage}
                      size="sm"
                      type="button"
                    >
                      Review message
                    </Button>
                    <Button
                      onClick={cancel}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : null}
              {streamError && !timeoutError ? (
                <p aria-live="polite" className="text-sm text-destructive">
                  {streamError}
                </p>
              ) : null}
              {error && !timeoutError ? (
                <p aria-live="polite" className="text-sm text-destructive">
                  {error.message || "Pilot could not complete this message."}
                </p>
              ) : null}
              <div className="flex items-center justify-between gap-3 px-3 pb-2">
                <p
                  aria-live="polite"
                  className="inline-flex items-center gap-2 text-xs text-muted-foreground"
                >
                  <Bot className="size-3.5 text-primary" aria-hidden="true" />
                  {isLoading
                    ? "Pilot is responding…"
                    : "Pilot can make mistakes. Check important work."}
                </p>
                {isLoading ? (
                  <Button
                    aria-label="Stop generating"
                    className="composer-action"
                    onClick={stop}
                    size="icon"
                    type="button"
                    variant="outline"
                  >
                    <Square
                      aria-hidden="true"
                      className="size-3.5 fill-current"
                    />
                  </Button>
                ) : (
                  <Button className="composer-action" size="icon" type="submit">
                    <SendHorizontal aria-hidden="true" className="size-4" />
                    <span className="sr-only">Send message</span>
                  </Button>
                )}
              </div>
            </form>
          ) : (
            <p className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-center text-sm text-muted-foreground">
              Messaging becomes available after this environment is connected to
              Pilot AI.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
