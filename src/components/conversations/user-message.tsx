"use client";

import { RiPencilLine } from "@remixicon/react";
import { useState } from "react";

import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
} from "@/components/ai-elements/message";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

function UserMessageEditor({
  content,
  onCancel,
  onSubmit,
}: {
  content: string;
  onCancel: () => void;
  onSubmit: (content: string) => void;
}) {
  const [draft, setDraft] = useState(content);
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
        <div className="flex justify-end gap-2">
          <Button onClick={onCancel} size="sm" type="button" variant="ghost">
            Cancel
          </Button>
          <Button
            disabled={!draft.trim() || draft.trim() === content}
            onClick={() => {
              onSubmit(draft);
            }}
            size="sm"
            type="button"
          >
            Save &amp; submit
          </Button>
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
  isLoading,
  onEdit,
}: {
  id?: string;
  content: string;
  isLoading?: boolean;
  onEdit?: (messageId: string, content: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing && id && onEdit) {
    return (
      <UserMessageEditor
        content={content}
        onCancel={() => {
          setIsEditing(false);
        }}
        onSubmit={(next) => {
          setIsEditing(false);
          onEdit(id, next);
        }}
      />
    );
  }

  return (
    <Message from="user">
      <MessageContent>
        <p className="whitespace-pre-wrap">{content}</p>
      </MessageContent>
      {id && onEdit ? (
        <MessageActions className="opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <MessageAction
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
