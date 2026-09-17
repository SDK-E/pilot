"use client";

import { useId, useRef, useState } from "react";

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
  PromptInputActionAddScreenshot,
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
import {
  COMPOSER_WRAPPER_CLASSNAME,
  useComposerSubmitState,
} from "@/components/conversations/composer-shared";
import { ComposerStatus } from "@/components/conversations/composer-status";
import { ConnectorToggleMenu } from "@/components/conversations/connector-toggle-menu";
import { SkillPicker } from "@/components/conversations/skill-picker";
import { useAttachmentUpload } from "@/components/conversations/use-attachment-upload";
import {
  shouldInsertComposerNewline,
  submitOnShortcut,
} from "@/hooks/use-message-submit-shortcut";

import type { MessageSendOptions } from "@/components/conversations/conversation-types";
import type { ComposerSkill } from "@/components/conversations/skill-picker";

const ACCEPTED_FILES =
  ".pdf,.txt,.md,.csv,.html,.json,.xml,.zip,.docx,.xlsx,.pptx,image/jpeg,image/png,image/webp,image/gif,image/svg+xml";
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

interface MessageComposerProps {
  conversationId: string;
  agentName: string;
  placeholder: string;
  draft: string;
  setDraft: (value: string) => void;
  isLoading: boolean;
  onSend: (text: string, options: MessageSendOptions) => void;
  onCancel: () => void;
  onRestoreLastPrompt: () => void;
  streamError?: string;
  timeoutError?: string;
  hasConnector: boolean;
  skills: ComposerSkill[];
}

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
  hasConnector,
  skills,
}: MessageComposerProps) {
  const shortcut = useSendMessageShortcut();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const errorId = useId();
  const [validationError, setValidationError] = useState<string>();
  const upload = useAttachmentUpload(conversationId);
  const [connectorToolIds, setConnectorToolIds] = useState<string[]>();
  const [skillIds, setSkillIds] = useState<string[]>([]);
  const isBusy = isLoading || upload.isUploading;
  const submitState = useComposerSubmitState({
    isBusy: upload.isUploading,
    text: draft,
  });
  const isStopControlDisabled = isLoading ? false : submitState.isDisabled;

  const submit = async (message: PromptInputMessage) => {
    const text = message.text.trim();
    if (!text) {
      setValidationError("Message cannot be blank.");
      textareaRef.current?.focus();
      return;
    }
    if (isBusy) return;
    setValidationError(undefined);
    let attachmentIds: string[] | undefined;
    if (message.files.length > 0) {
      const uploaded = await upload.uploadAll(message.files);
      if (!uploaded) return;
      attachmentIds = uploaded;
    }
    onSend(text, { attachmentIds, connectorToolIds, skillIds });
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
        className={COMPOSER_WRAPPER_CLASSNAME}
        globalDrop
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
            className="max-h-52 min-h-11 px-3 py-2.5 text-sm leading-6"
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
            rows={1}
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
                <PromptInputActionAddScreenshot label="Add screenshot" />
              </PromptInputActionMenuContent>
            </PromptInputActionMenu>
            <ConnectorToggleMenu
              disabled={isBusy}
              hasConnector={hasConnector}
              onChange={setConnectorToolIds}
              selected={connectorToolIds}
            />
            <SkillPicker
              disabled={isBusy}
              onChange={setSkillIds}
              selected={skillIds}
              skills={skills}
            />
            <span className="px-1 text-xs text-muted-foreground">
              {agentName}
            </span>
          </PromptInputTools>
          <PromptInputSubmit
            className="transition-transform active:scale-90"
            disabled={isStopControlDisabled}
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
