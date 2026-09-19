"use client";

import {
  RiAttachment2,
  RiDeleteBinLine,
  RiFileTextLine,
} from "@remixicon/react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";

interface UserFile {
  id: string;
  filename: string;
  contentType: string;
  byteSize: number;
}

const ACCEPTED = ".pdf,.txt,.md,.csv,.docx,.xlsx,.jpg,.jpeg,.png,.webp";

function useUserFileActions() {
  const [error, setError] = useState<string>();
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string>();

  async function upload(file: File) {
    setError(undefined);
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const response = await fetch("/api/user-files", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Pilot could not upload this file.");
      location.reload();
    } catch (error_) {
      setError(
        error_ instanceof Error
          ? error_.message
          : "Pilot could not upload this file.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  async function remove(file: UserFile) {
    setError(undefined);
    setDeletingId(file.id);
    try {
      const response = await fetch(`/api/user-files/${file.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Pilot could not delete this file.");
      location.reload();
    } catch (error_) {
      setError(
        error_ instanceof Error
          ? error_.message
          : "Pilot could not delete this file.",
      );
    } finally {
      setDeletingId(undefined);
    }
  }

  return { error, isUploading, deletingId, upload, remove };
}

/**
 * A member's own knowledge base: files usable as context in every
 * conversation they have, regardless of project.
 */
export function UserFilesSection({ files }: { files: UserFile[] }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const actions = useUserFileActions();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your files</CardTitle>
        <CardDescription>
          Reference files for every conversation you have, in any project. Text,
          CSV, PDF, and DOCX are given to the agent as bounded untrusted
          context.
        </CardDescription>
        <CardAction>
          <input
            accept={ACCEPTED}
            className="sr-only"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              if (file) void actions.upload(file);
            }}
            ref={inputRef}
            type="file"
          />
          <Button
            disabled={actions.isUploading}
            onClick={() => inputRef.current?.click()}
            type="button"
            variant="outline"
          >
            <RiAttachment2 aria-hidden="true" />
            {actions.isUploading ? "Uploading…" : "Upload file"}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        {actions.error ? (
          <p aria-live="polite" className="text-xs text-destructive">
            {actions.error}
          </p>
        ) : null}
        {files.length > 0 ? (
          <ItemGroup>
            {files.map((file) => (
              <Item key={file.id} size="sm" variant="outline">
                <ItemMedia variant="icon">
                  <RiFileTextLine aria-hidden="true" />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>
                    <a
                      className="truncate hover:underline"
                      href={`/api/user-files/${file.id}`}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {file.filename}
                    </a>
                  </ItemTitle>
                  <ItemDescription>
                    {Math.ceil(file.byteSize / 1024)} KB
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
                  <Button
                    aria-label={`Delete ${file.filename}`}
                    disabled={actions.deletingId === file.id}
                    onClick={() => void actions.remove(file)}
                    size="icon-sm"
                    type="button"
                    variant="ghost"
                  >
                    <RiDeleteBinLine aria-hidden="true" />
                  </Button>
                </ItemActions>
              </Item>
            ))}
          </ItemGroup>
        ) : (
          <p className="text-xs text-muted-foreground">No files yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
