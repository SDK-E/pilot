"use client";

import { RiRobot2Line } from "@remixicon/react";
import { useCallback, useId, useRef, useState } from "react";

import {
  Attachment,
  AttachmentInfo,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
} from "@/components/ai-elements/attachments";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  type PromptInputMessage,
  usePromptInputAttachments,
} from "@/components/ai-elements/prompt-input";
import { useSendMessageShortcut } from "@/components/conversations/composer-preferences";
import { ComposerStatus } from "@/components/conversations/composer-status";
import {
  shouldInsertComposerNewline,
  submitOnShortcut,
} from "@/hooks/use-message-submit-shortcut";

const ACCEPTED_FILES =
  ".pdf,.txt,.md,.csv,.docx,.xlsx,image/jpeg,image/png,image/webp";
const MAX_FILE_BYTES = 10 * 1024 * 1024;

function AttachmentPreviews() {
  const attachments = usePromptInputAttachments();
  if (attachments.files.length === 0) return null;
  return (
    <Attachments className="px-1 pt-1" variant="inline">
      {attachments.files.map((file) => (
        <Attachment
          data={file}
          key={file.id}
          onRemove={() => {
            attachments.remove(file.id);
          }}
        >
          <AttachmentPreview />
          <AttachmentInfo />
          <AttachmentRemove />
        </Attachment>
      ))}
    </Attachments>
  );
}

async function toFile(part: PromptInputMessage["files"][number]) {
  if (!part.url) throw new Error("Pilot could not read this attachment.");
  const response = await fetch(part.url);
  if (!response.ok) throw new Error("Pilot could not read this attachment.");
  const blob = await response.blob();
  return new File([blob], part.filename ?? "attachment", {
    type: part.mediaType || blob.type || "application/octet-stream",
  });
}

function useAttachmentUpload(conversationId: string) {
  const [error, setError] = useState<string>();
  const [isUploading, setIsUploading] = useState(false);
  const uploadAll = useCallback(
    async (parts: PromptInputMessage["files"]) => {
      setIsUploading(true);
      setError(undefined);
      try {
        for (const part of parts) {
          const formData = new FormData();
          formData.set("file", await toFile(part));
          const result = await fetch(
            `/api/conversations/${conversationId}/attachments`,
            {
              method: "POST",
              body: formData,
            },
          );
          if (!result.ok) throw new Error("Pilot could not attach this file.");
        }
        return true;
      } catch (error_) {
        setError(
          error_ instanceof Error
            ? error_.message
            : "Pilot could not attach this file.",
        );
        return false;
      } finally {
        setIsUploading(false);
      }
    },
    [conversationId],
  );
  return { error, setError, isUploading, uploadAll };
}

interface MessageComposerProps {
  conversationId: string;
  agentName: string;
  placeholder: string;
  draft: string;
  setDraft: (value: string) => void;
  isLoading: boolean;
  onSend: (text: string) => void;
  onCancel: () => void;
  onRestoreLastPrompt: () => void;
  streamError?: string;
  timeoutError?: string;
}

/**
 * The docked composer of an open conversation, with file attachments and
 * the errors of the last turn.
 */
export function MessageComposer({
  conversationId,
  agentName,
  placeholder,
  draft,
  setDraft,
  isLoading,
  onSend,
  onCancel,
  onRestoreLastPrompt,
  streamError,
  timeoutError,
}: MessageComposerProps) {
  const shortcut = useSendMessageShortcut();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const errorId = useId();
  const [validationError, setValidationError] = useState<string>();
  const upload = useAttachmentUpload(conversationId);
  const isBusy = isLoading || upload.isUploading;

  const submit = async (message: PromptInputMessage) => {
    const text = message.text.trim();
    if (!text) {
      setValidationError("Message cannot be blank.");
      textareaRef.current?.focus();
      return;
    }
    if (isBusy) return;
    setValidationError(undefined);
    if (message.files.length > 0 && !(await upload.uploadAll(message.files)))
      return;
    onSend(text);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (submitOnShortcut(event, shortcut)) return;
    if (shouldInsertComposerNewline(event, shortcut)) {
      event.preventDefault();
      const textarea = event.currentTarget;
      const at = textarea.selectionStart;
      setDraft(
        `${textarea.value.slice(0, at)}\n${textarea.value.slice(textarea.selectionEnd)}`,
      );
      requestAnimationFrame(() => {
        textarea.setSelectionRange(at + 1, at + 1);
      });
    }
  };

  const errorMessage = timeoutError ?? upload.error ?? streamError;

  return (
    <div className="mx-auto w-full max-w-3xl">
      <PromptInput
        accept={ACCEPTED_FILES}
        className="rounded-xl border bg-card p-2 shadow-sm transition-shadow focus-within:shadow-md"
        maxFileSize={MAX_FILE_BYTES}
        multiple
        onError={(event) => {
          upload.setError(event.message);
        }}
        onSubmit={(message) => submit(message)}
      >
        <AttachmentPreviews />
        <PromptInputBody>
          <PromptInputTextarea
            aria-describedby={validationError ? errorId : undefined}
            aria-invalid={validationError ? true : undefined}
            aria-label={`Message ${agentName}`}
            className="min-h-20 px-3 pt-3 text-sm leading-6 sm:min-h-24"
            disabled={isBusy}
            maxLength={10_000}
            onChange={(event) => {
              setDraft(event.currentTarget.value);
              if (validationError) setValidationError(undefined);
            }}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            ref={textareaRef}
            required
            rows={2}
            value={draft}
          />
        </PromptInputBody>
        <PromptInputFooter className="px-1 pb-1">
          <PromptInputTools>
            <PromptInputActionMenu>
              <PromptInputActionMenuTrigger
                disabled={isBusy}
                tooltip="Add files"
              />
              <PromptInputActionMenuContent>
                <PromptInputActionAddAttachments label="Add files" />
              </PromptInputActionMenuContent>
            </PromptInputActionMenu>
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
              <RiRobot2Line aria-hidden="true" className="text-primary" />
              {agentName}
            </span>
          </PromptInputTools>
          <PromptInputSubmit
            disabled={isLoading ? false : !draft.trim() || upload.isUploading}
            onStop={onCancel}
            status={isLoading ? "streaming" : "ready"}
          />
        </PromptInputFooter>
      </PromptInput>
      <ComposerStatus
        errorId={errorId}
        errorMessage={errorMessage}
        isLoading={isLoading}
        onCancel={onCancel}
        onRestoreLastPrompt={onRestoreLastPrompt}
        timeoutError={timeoutError}
        validationError={validationError}
      />
    </div>
  );
}
