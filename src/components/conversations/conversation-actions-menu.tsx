"use client";

import {
  RiCloseLine,
  RiDeleteBinLine,
  RiDownloadLine,
  RiFileTextLine,
  RiFolder3Line,
  RiMoreLine,
  RiPencilLine,
} from "@remixicon/react";
import { useRouter } from "next/navigation";
import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";

import {
  deleteConversationAction,
  renameConversationAction,
  type ActionState,
} from "@/app/(workspace)/[mode]/[conversationId]/actions";
import { setConversationProjectAction } from "@/app/(workspace)/projects/actions";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";

const initialState: ActionState = { status: "idle" };

interface Project {
  id: string;
  name: string;
}

function RenameDialog({
  conversationId,
  title,
  isOpen,
  onOpenChange,
}: {
  conversationId: string;
  title: string;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}) {
  const form = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(
    renameConversationAction,
    initialState,
  );

  useEffect(() => {
    if (state.status !== "success") return;
    form.current?.reset();
    startTransition(() => {
      onOpenChange(false);
    });
  }, [state.status, onOpenChange]);

  return (
    <Dialog onOpenChange={onOpenChange} open={isOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename conversation</DialogTitle>
          <DialogDescription>
            Choose a name that makes this private chat easier to find.
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-4" ref={form}>
          <input name="conversationId" type="hidden" value={conversationId} />
          <Input
            aria-label="Conversation title"
            defaultValue={title}
            maxLength={200}
            name="title"
            required
          />
          {state.status === "error" ? (
            <p className="text-xs text-destructive">{state.message}</p>
          ) : null}
          <DialogFooter>
            <Button disabled={pending} type="submit">
              {pending ? "Saving…" : "Save title"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({
  conversationId,
  isOpen,
  onOpenChange,
}: {
  conversationId: string;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}) {
  const [state, action, pending] = useActionState(
    deleteConversationAction,
    initialState,
  );

  return (
    <AlertDialog onOpenChange={onOpenChange} open={isOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this conversation?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes this private chat, its messages, and its
            saved working context. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {state.status === "error" ? (
          <p aria-live="polite" className="text-sm text-destructive">
            {state.message}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <form action={action}>
            <input name="conversationId" type="hidden" value={conversationId} />
            <Button disabled={pending} type="submit" variant="destructive">
              {pending ? "Deleting…" : "Delete conversation"}
            </Button>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
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
    </>
  );
}
