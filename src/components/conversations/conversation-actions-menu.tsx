"use client";

import {
  RiBrainLine,
  RiCloseLine,
  RiDeleteBinLine,
  RiDownloadLine,
  RiFileTextLine,
  RiFolder3Line,
  RiMoreLine,
  RiPencilLine,
} from "@remixicon/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { setConversationProjectAction } from "@/app/(workspace)/projects/actions";
import {
  DeleteDialog,
  RenameDialog,
} from "@/components/conversations/conversation-lifecycle-dialogs";
import { ConversationMemoryDialog } from "@/components/conversations/conversation-memory-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Project {
  id: string;
  name: string;
}

function ProjectSubmenu({
  conversationId,
  currentProject,
  projects,
}: {
  conversationId: string;
  currentProject?: Project;
  projects: Project[];
}) {
  const router = useRouter();
  const [isPending, startProjectTransition] = useTransition();

  function setProject(projectId: string | null) {
    if (projectId === (currentProject?.id ?? null)) return;
    startProjectTransition(async () => {
      const result = await setConversationProjectAction({
        conversationId,
        projectId,
      });
      if (result.status === "success") router.refresh();
    });
  }

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger disabled={isPending}>
        <RiFolder3Line aria-hidden="true" />
        {currentProject?.name ?? "Choose project"}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="w-56">
        <DropdownMenuLabel>Choose a project</DropdownMenuLabel>
        {projects.length === 0 ? (
          <p className="px-2 py-2 text-xs text-muted-foreground">
            Create a project before adding this chat.
          </p>
        ) : (
          <DropdownMenuRadioGroup
            onValueChange={setProject}
            value={currentProject?.id}
          >
            {projects.map((project) => (
              <DropdownMenuRadioItem key={project.id} value={project.id}>
                <span className="truncate">{project.name}</span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        )}
        {currentProject ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => {
                setProject(null);
              }}
              variant="destructive"
            >
              <RiCloseLine aria-hidden="true" /> Remove from project
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}

/**
 * Every conversation-level action - rename, export, project, delete - behind
 * one menu instead of a row of buttons that overflowed the header on
 * anything narrower than a wide desktop window.
 */
export function ConversationActionsMenu({
  conversationId,
  title,
  project,
  projects,
}: {
  conversationId: string;
  title: string;
  project?: { id: string; name: string; sharedMemoryEnabled: boolean };
  projects: Project[];
}) {
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isMemoryOpen, setIsMemoryOpen] = useState(false);
  const exportHref = (format: "md" | "pdf") =>
    `/api/conversations/${conversationId}/export?format=${format}`;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button aria-label="Conversation actions" size="icon" variant="ghost">
            <RiMoreLine aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem
            onSelect={() => {
              setIsRenameOpen(true);
            }}
          >
            <RiPencilLine aria-hidden="true" /> Rename
          </DropdownMenuItem>
          <ProjectSubmenu
            conversationId={conversationId}
            currentProject={project}
            projects={projects}
          />
          <DropdownMenuItem
            onSelect={() => {
              setIsMemoryOpen(true);
            }}
          >
            <RiBrainLine aria-hidden="true" /> Memory & instructions
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={exportHref("md")}>
              <RiDownloadLine aria-hidden="true" /> Download as Markdown
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={exportHref("pdf")}>
              <RiFileTextLine aria-hidden="true" /> Download as PDF
            </a>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              setIsDeleteOpen(true);
            }}
            variant="destructive"
          >
            <RiDeleteBinLine aria-hidden="true" /> Delete conversation
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <RenameDialog
        conversationId={conversationId}
        isOpen={isRenameOpen}
        onOpenChange={setIsRenameOpen}
        title={title}
      />
      <DeleteDialog
        conversationId={conversationId}
        isOpen={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
      />
      <ConversationMemoryDialog
        conversationId={conversationId}
        isOpen={isMemoryOpen}
        onOpenChange={setIsMemoryOpen}
      />
    </>
  );
}
