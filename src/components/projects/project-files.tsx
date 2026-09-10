"use client";

import { useRef, useState } from "react";
import { FileText, Paperclip, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type ProjectFile = {
  id: string;
  filename: string;
  contentType: string;
  byteSize: number;
};

export function ProjectFiles({
  projectId,
  files,
}: {
  projectId: string;
  files: ProjectFile[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string>();
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string>();

  async function upload(file: File) {
    setError(undefined);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const response = await fetch(`/api/projects/${projectId}/files`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok)
        throw new Error("Pilot could not upload this project file.");
      window.location.reload();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Pilot could not upload this project file.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function remove(file: ProjectFile) {
    setError(undefined);
    setDeleting(file.id);
    try {
      const response = await fetch(`/api/project-files/${file.id}`, {
        method: "DELETE",
      });
      if (!response.ok)
        throw new Error("Pilot could not delete this project file.");
      window.location.reload();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Pilot could not delete this project file.",
      );
    } finally {
      setDeleting(undefined);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card/50 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-medium">Project files</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Add reference files for chats in this private Project. Text, CSV,
            PDF, and DOCX files are provided to the agent as bounded untrusted
            context. Images and spreadsheets can be stored and opened here but
            are not analyzed yet.
          </p>
        </div>
        <input
          accept=".pdf,.txt,.md,.csv,.docx,.xlsx,.jpg,.jpeg,.png,.webp"
          className="sr-only"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            if (file) void upload(file);
          }}
          ref={inputRef}
          type="file"
        />
        <Button
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          type="button"
          variant="outline"
        >
          <Paperclip aria-hidden="true" />
          {uploading ? "Uploading…" : "Upload file"}
        </Button>
      </div>
      {error ? (
        <p aria-live="polite" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {files.length ? (
        <ul className="mt-4 divide-y divide-border rounded-xl border border-border">
          {files.map((file) => (
            <li className="flex items-center gap-3 px-3 py-2" key={file.id}>
              <FileText aria-hidden="true" className="size-4 text-primary" />
              <a
                className="min-w-0 flex-1 truncate text-sm hover:text-primary"
                href={`/api/project-files/${file.id}`}
                rel="noreferrer"
                target="_blank"
              >
                {file.filename}
              </a>
              <span className="text-xs text-muted-foreground">
                {Math.ceil(file.byteSize / 1024)} KB
              </span>
              <Button
                aria-label={`Delete ${file.filename}`}
                disabled={deleting === file.id}
                onClick={() => void remove(file)}
                size="icon-xs"
                type="button"
                variant="ghost"
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          No Project files yet.
        </p>
      )}
    </section>
  );
}
