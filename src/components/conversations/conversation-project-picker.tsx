"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FolderKanban, X } from "lucide-react";
import { setConversationProjectAction } from "@/app/workspace/projects/actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Project = { id: string; name: string };

type ConversationProjectPickerProps = {
  conversationId: string;
  currentProject?: Project;
  projects: Project[];
};

export function ConversationProjectPicker({
  conversationId,
  currentProject,
  projects,
}: ConversationProjectPickerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  function setProject(projectId: string | null) {
    if (projectId === currentProject?.id) return;
    setError(undefined);
    startTransition(async () => {
      const result = await setConversationProjectAction({
        conversationId,
        projectId,
      });
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="relative">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label="Choose project"
            disabled={isPending}
            size="sm"
            variant="ghost"
          >
            <FolderKanban aria-hidden="true" className="size-3.5" />
            <span className="hidden sm:inline">
              {currentProject?.name ?? "Choose project"}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Choose a project</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            onValueChange={(projectId) => setProject(projectId)}
            value={currentProject?.id}
          >
            {projects.map((project) => (
              <DropdownMenuRadioItem key={project.id} value={project.id}>
                <span className="truncate">{project.name}</span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          {currentProject ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => setProject(null)}
                variant="destructive"
              >
                <X aria-hidden="true" /> Remove from project
              </DropdownMenuItem>
            </>
          ) : null}
          {projects.length === 0 ? (
            <p className="px-2 py-2 text-sm text-muted-foreground">
              Create a project before adding this chat.
            </p>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      {error ? (
        <p
          aria-live="polite"
          className="absolute right-0 top-full z-10 mt-1 w-64 text-right text-xs text-destructive"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
