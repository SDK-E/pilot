import { RiDeleteBinLine } from "@remixicon/react";

import {
  createMemoryAction,
  deleteMemoryAction,
} from "@/app/(workspace)/settings/memory-actions";
import { FormSubmitToast } from "@/components/settings/form-submit-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
} from "@/components/ui/item";

import type { Memory } from "@/memory/memory-repository";

/**
 * Explicit, member-authored notes an agent is given as context — distinct
 * from pilot-ai's own semantic conversation memory. `scope` decides both
 * which notes this instance lists and who may add one when creating a note
 * here (`createMemoryAction` — organization scope is admin-only).
 */
export function MemorySection({
  scope,
  title,
  description,
  memories,
  projectId,
  conversationId,
}: {
  scope: "organization" | "user" | "project" | "conversation";
  title: string;
  description: string;
  memories: Memory[];
  projectId?: string;
  conversationId?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <form action={createMemoryAction} className="flex gap-2">
          <input name="scope" type="hidden" value={scope} />
          {projectId ? (
            <input name="projectId" type="hidden" value={projectId} />
          ) : null}
          {conversationId ? (
            <input name="conversationId" type="hidden" value={conversationId} />
          ) : null}
          <Input
            aria-label="New memory note"
            maxLength={1000}
            name="content"
            placeholder="Something to remember…"
            required
          />
          <Button type="submit" variant="outline">
            Add
          </Button>
          <FormSubmitToast message="Memory added" />
        </form>
        {memories.length > 0 ? (
          <ItemGroup>
            {memories.map((memory) => (
              <Item key={memory.id} size="sm" variant="outline">
                <ItemContent>{memory.content}</ItemContent>
                <ItemActions>
                  <form action={deleteMemoryAction}>
                    <input name="memoryId" type="hidden" value={memory.id} />
                    <Button
                      aria-label="Delete this memory"
                      size="icon-sm"
                      type="submit"
                      variant="ghost"
                    >
                      <RiDeleteBinLine aria-hidden="true" />
                    </Button>
                    <FormSubmitToast message="Memory removed" />
                  </form>
                </ItemActions>
              </Item>
            ))}
          </ItemGroup>
        ) : (
          <p className="text-xs text-muted-foreground">No notes yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
