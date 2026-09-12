"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function DeleteAttachmentButton({
  attachmentId,
  filename,
}: {
  attachmentId: string;
  filename: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string>();

  async function deleteAttachment() {
    setDeleting(true);
    setError(undefined);
    try {
      const response = await fetch(`/api/attachments/${attachmentId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => undefined)) as
          { error?: unknown } | undefined;
        throw new Error(
          typeof payload?.error === "string"
            ? payload.error
            : "Pilot could not delete this file.",
        );
      }
      setOpen(false);
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Pilot could not delete this file.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          aria-label={`Delete ${filename}`}
          className="size-6 text-muted-foreground hover:text-destructive"
          size="icon-xs"
          type="button"
          variant="ghost"
        >
          <Trash2 aria-hidden="true" className="size-3" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {filename}?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes the file from this private chat.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? (
          <p aria-live="polite" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <Button
            disabled={deleting}
            onClick={() => void deleteAttachment()}
            type="button"
            variant="destructive"
          >
            {deleting ? "Deleting…" : "Delete file"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
