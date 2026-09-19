"use client";

import { RiDeleteBinLine } from "@remixicon/react";
import { useActionState, useCallback, useEffect, useState } from "react";

import { updateConversationInstructionsAction } from "@/app/(workspace)/[mode]/[conversationId]/actions";
import {
  createMemoryAction,
  deleteMemoryAction,
} from "@/app/(workspace)/settings/memory-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
} from "@/components/ui/item";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import type { ActionState } from "@/app/(workspace)/[mode]/[conversationId]/actions";

interface ConversationMemory {
  id: string;
  content: string;
}

const initialState: ActionState = { status: "idle" };

function useConversationMemoryData(conversationId: string, isOpen: boolean) {
  const [instructions, setInstructions] = useState<string | null>(null);
  const [memories, setMemories] = useState<ConversationMemory[]>([]);

  const reload = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const response = await fetch(
          `/api/conversations/${conversationId}/memory`,
          { signal },
        );
        if (!response.ok) return;
        const data = (await response.json()) as {
          instructions: string | null;
          memories: ConversationMemory[];
        };
        setInstructions(data.instructions);
        setMemories(data.memories);
      } catch {
        // Leave whatever was last loaded rather than surfacing an error for
        // what is read-then-refresh data, not a form the user is mid-typing.
      }
    },
    [conversationId],
  );

  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    async function load() {
      await reload(controller.signal);
    }
    void load();
    return () => {
      controller.abort();
    };
  }, [isOpen, reload]);

  return { instructions, memories, reload };
}

/**
 * This conversation's own instructions and remembered notes — the
 * narrowest tier, above nothing else. See `turn-instructions.ts`.
 */
export function ConversationMemoryDialog({
  conversationId,
  isOpen,
  onOpenChange,
}: {
  conversationId: string;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}) {
  const { instructions, memories, reload } = useConversationMemoryData(
    conversationId,
    isOpen,
  );
  const [instructionsState, instructionsAction, isInstructionsPending] =
    useActionState(updateConversationInstructionsAction, initialState);

  return (
    <Dialog onOpenChange={onOpenChange} open={isOpen}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Memory & instructions</DialogTitle>
          <DialogDescription>
            Apply only to this conversation, on top of your own and this
            organization&apos;s standing instructions.
          </DialogDescription>
        </DialogHeader>
        <form action={instructionsAction} className="space-y-2">
          <input name="conversationId" type="hidden" value={conversationId} />
          <Label htmlFor="conversation-instructions">Instructions</Label>
          <Textarea
            className="min-h-24"
            defaultValue={instructions ?? ""}
            id="conversation-instructions"
            key={instructions}
            maxLength={4000}
            name="instructions"
            placeholder="e.g. Keep this thread focused on the Q3 launch plan."
          />
          {instructionsState.message ? (
            <p
              className={
                instructionsState.status === "error"
                  ? "text-xs text-destructive"
                  : "text-xs text-primary"
              }
            >
              {instructionsState.message}
            </p>
          ) : null}
          <Button disabled={isInstructionsPending} size="sm" type="submit">
            {isInstructionsPending ? "Saving…" : "Save instructions"}
          </Button>
        </form>
        <div className="space-y-2">
          <Label>Memory</Label>
          <form
            action={async (formData) => {
              await createMemoryAction(formData);
              await reload();
            }}
            className="flex gap-2"
          >
            <input name="scope" type="hidden" value="conversation" />
            <input name="conversationId" type="hidden" value={conversationId} />
            <Input
              aria-label="New memory note"
              maxLength={1000}
              name="content"
              placeholder="Something to remember for this chat…"
              required
            />
            <Button size="sm" type="submit" variant="outline">
              Add
            </Button>
          </form>
          {memories.length > 0 ? (
            <ItemGroup>
              {memories.map((memory) => (
                <Item key={memory.id} size="sm" variant="outline">
                  <ItemContent>{memory.content}</ItemContent>
                  <ItemActions>
                    <form
                      action={async (formData) => {
                        await deleteMemoryAction(formData);
                        await reload();
                      }}
                    >
                      <input name="memoryId" type="hidden" value={memory.id} />
                      <Button
                        aria-label="Delete this memory"
                        size="icon-sm"
                        type="submit"
                        variant="ghost"
                      >
                        <RiDeleteBinLine aria-hidden="true" />
                      </Button>
                    </form>
                  </ItemActions>
                </Item>
              ))}
            </ItemGroup>
          ) : (
            <p className="text-xs text-muted-foreground">No notes yet.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
