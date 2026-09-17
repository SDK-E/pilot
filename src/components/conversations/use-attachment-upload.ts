"use client";

import { useCallback, useState } from "react";

import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";

async function toFile(part: PromptInputMessage["files"][number]) {
  if (!part.url) throw new Error("Pilot could not read this attachment.");
  const response = await fetch(part.url);
  if (!response.ok) throw new Error("Pilot could not read this attachment.");
  const blob = await response.blob();
  return new File([blob], part.filename ?? "attachment", {
    type: part.mediaType || blob.type || "application/octet-stream",
  });
}

/**
 * Uploads composer file parts to a conversation's attachments endpoint,
 * returning the created attachment ids so a caller can parent them onto
 * the message once it exists (see `attachConversationAttachmentsToMessage`).
 */
export function useAttachmentUpload(conversationId: string) {
  const [error, setError] = useState<string>();
  const [isUploading, setIsUploading] = useState(false);
  const uploadAll = useCallback(
    async (parts: PromptInputMessage["files"]): Promise<string[] | false> => {
      setIsUploading(true);
      setError(undefined);
      try {
        const ids: string[] = [];
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
          const created = (await result.json()) as { id: string };
          ids.push(created.id);
        }
        return ids;
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
