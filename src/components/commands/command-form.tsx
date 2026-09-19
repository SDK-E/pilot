"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import {
  createCommandAction,
  updateCommandAction,
} from "@/app/(workspace)/commands/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import type { CommandFormState } from "@/commands/command-form-state";
import type { Command } from "@/commands/command-repository";

const initialState: CommandFormState = { status: "idle" };

/**
 * Create or edit one command: a name, description, and the prompt text the
 * composer's `/` palette expands into the draft. `{placeholder}` tokens are
 * inserted as-is for the member to fill in — see `command-palette.tsx`.
 */
export function CommandForm({ command }: { command?: Command }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    command ? updateCommandAction : createCommandAction,
    initialState,
  );
  const submitLabel = command ? "Save command" : "Create command";
  useEffect(() => {
    if (state.status === "success" && state.href) router.push(state.href);
  }, [router, state.href, state.status]);

  return (
    <form action={action} className="space-y-6">
      {command ? (
        <input name="commandId" type="hidden" value={command.id} />
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="command-name">Name</Label>
        <Input
          defaultValue={command?.name}
          id="command-name"
          maxLength={100}
          name="name"
          placeholder="summarize"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="command-description">Description</Label>
        <Input
          defaultValue={command?.description}
          id="command-description"
          maxLength={300}
          name="description"
          placeholder="What this command is for"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="command-prompt-template">Prompt template</Label>
        <Textarea
          className="min-h-32"
          defaultValue={command?.promptTemplate}
          id="command-prompt-template"
          maxLength={4000}
          name="promptTemplate"
          placeholder="Summarize {topic} in three bullet points."
          required
        />
        <p className="text-xs text-muted-foreground">
          Inserted into the composer draft when picked from the <code>/</code>{" "}
          palette. Use <code>{"{placeholder}"}</code> for anything the member
          should fill in themselves.
        </p>
      </div>
      {state.message ? (
        <p
          aria-live="polite"
          className={
            state.status === "error"
              ? "text-sm text-destructive"
              : "text-sm text-primary"
          }
        >
          {state.message}
        </p>
      ) : null}
      <Button disabled={pending} type="submit">
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
