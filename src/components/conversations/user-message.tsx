"use client";

import { RiCloseLine, RiPencilLine } from "@remixicon/react";
import { useRef, useState } from "react";

import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
} from "@/components/ai-elements/message";
import { useAttachmentUpload } from "@/components/conversations/use-attachment-upload";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import type { MessageSendOptions } from "@/components/conversations/conversation-types";

interface EditableAttachment {
  id: string;
  filename: string;
}

function EditorAttachments({
  attachments,
  onRemove,
}: {
  attachments: EditableAttachment[];
  onRemove: (id: string) => void;
}) {
  if (attachments.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Attachments">
      {attachments.map((attachment) => (
        <li key={attachment.id}>
          <Badge className="h-7 max-w-64 gap-1 pr-1 pl-2" variant="outline">
            <span className="max-w-48 truncate">{attachment.filename}</span>
            <button
              aria-label={`Remove ${attachment.filename}`}
              className="rounded-full p-0.5 hover:bg-muted"
              onClick={() => {
                onRemove(attachment.id);
              }}
              type="button"
            >
              <RiCloseLine aria-hidden="true" className="size-3.5" />
            </button>
          </Badge>
        </li>
      ))}
    </ul>
  );
}

function UserMessageEditor({
  content,
  attachments,
  conversationId,
  onCancel,
  onSubmit,
}: {
  content: string;
  attachments: EditableAttachment[];
  conversationId: string;
  onCancel: () => void;
  onSubmit: (content: string, attachmentIds: string[]) => void;
}) {
  const [draft, setDraft] = useState(content);
  const [currentAttachments, setCurrentAttachments] = useState(attachments);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const upload = useAttachmentUpload(conversationId);

  const addFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const parts = [...files].map((file) => ({
      type: "file" as const,
      filename: file.name,
      mediaType: file.type,
      url: URL.createObjectURL(file),
    }));
    const ids = await upload.uploadAll(parts);
    if (!ids) return;
    setCurrentAttachments((current) => [
      ...current,
      ...ids.map((id, index) => ({
        id,
        filename: parts[index]?.filename ?? "attachment",
      })),
    ]);
  };

  const isDirty =
    draft.trim() !== content ||
    currentAttachments.length !== attachments.length ||
    currentAttachments.some(
      (attachment, index) => attachment.id !== attachments[index]?.id,
    );

  return (
    <Message from="user">
      <MessageContent className="w-full max-w-full group-[.is-user]:ml-0 group-[.is-user]:w-full group-[.is-user]:bg-transparent group-[.is-user]:p-0">
        <Textarea
          autoFocus
          className="min-h-24 w-full resize-none"
          onChange={(event) => {
            setDraft(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") onCancel();
          }}
          value={draft}
        />
        <EditorAttachments
          attachments={currentAttachments}
          onRemove={(id) => {
            setCurrentAttachments((current) =>
              current.filter((attachment) => attachment.id !== id),
            );
          }}
        />
        {upload.error ? (
          <p className="text-xs text-destructive">{upload.error}</p>
        ) : null}
        <div className="flex items-center justify-between gap-2">
          <input
            className="hidden"
            multiple
            onChange={(event) => {
              void addFiles(event.currentTarget.files);
              event.currentTarget.value = "";
            }}
            ref={fileInputRef}
            type="file"
          />
          <Button
            disabled={upload.isUploading}
            onClick={() => {
              fileInputRef.current?.click();
            }}
            size="sm"
            type="button"
            variant="ghost"
          >
            Add files
          </Button>
          <div className="flex gap-2">
            <Button onClick={onCancel} size="sm" type="button" variant="ghost">
              Cancel
            </Button>
            <Button
              disabled={!draft.trim() || !isDirty || upload.isUploading}
              onClick={() => {
                onSubmit(
                  draft,
                  currentAttachments.map((attachment) => attachment.id),
                );
              }}
              size="sm"
              type="button"
            >
              Save &amp; submit
            </Button>
          </div>
        </div>
      </MessageContent>
    </Message>
  );
}

/**
 * A user turn in the transcript. Persisted messages carry an `id` and
 * `onEdit`, which turns on the hover Edit action and its inline textarea;
 * transient bubbles (a still-streaming send, a finished-this-session turn)
 * pass neither and render as plain, non-editable text.
 */
export function UserMessage({
  id,
  content,
  attachments = [],
  conversationId,
  isLoading,
  onEdit,
}: {
  id?: string;
  content: string;
  attachments?: EditableAttachment[];
  conversationId?: string;
  isLoading?: boolean;
  onEdit?: (
    messageId: string,
    content: string,
    options: MessageSendOptions,
  ) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing && id && onEdit && conversationId) {
    return (
      <UserMessageEditor
        attachments={attachments}
        content={content}
        conversationId={conversationId}
        onCancel={() => {
          setIsEditing(false);
        }}
        onSubmit={(next, attachmentIds) => {
          setIsEditing(false);
          onEdit(id, next, { attachmentIds });
        }}
      />
    );
  }

  return (
    <Message from="user">
      <MessageContent>
        <p className="whitespace-pre-wrap">{content}</p>
        {attachments.length > 0 ? (
          <ul className="mt-2 flex flex-wrap gap-2" aria-label="Attachments">
            {attachments.map((attachment) => (
              <li key={attachment.id}>
                <Badge className="h-6 max-w-64 truncate" variant="outline">
                  <a
                    className="truncate hover:underline"
                    href={`/api/attachments/${attachment.id}`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {attachment.filename}
                  </a>
                </Badge>
              </li>
            ))}
          </ul>
        ) : null}
      </MessageContent>
      {id && onEdit && conversationId ? (
        <MessageActions className="justify-end opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <MessageAction
            className="transition-transform active:scale-90"
            disabled={isLoading}
            label="Edit message"
            onClick={() => {
              setIsEditing(true);
            }}
            tooltip="Edit"
          >
            <RiPencilLine aria-hidden="true" />
          </MessageAction>
        </MessageActions>
      ) : null}
    </Message>
  );
}
