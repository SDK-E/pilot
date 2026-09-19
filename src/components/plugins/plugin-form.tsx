"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import { TOOL_IDS } from "@/agents/agent-kinds";
import { TOOLS } from "@/agents/agent-tools";
import {
  createPluginAction,
  updatePluginAction,
} from "@/app/(workspace)/plugins/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { Command } from "@/commands/command-repository";
import type { PluginFormState } from "@/plugins/plugin-form-state";
import type { Plugin } from "@/plugins/plugin-repository";

const initialState: PluginFormState = { status: "idle" };

function CommandRules({
  commands,
  plugin,
}: {
  commands: Pick<Command, "id" | "name" | "description">[];
  plugin?: Plugin;
}) {
  if (commands.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No commands to bundle yet — create one first.
      </p>
    );
  }
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {commands.map((command) => {
        const isEnabled = plugin
          ? plugin.commandIds.includes(command.id)
          : false;
        return (
          <div
            className="flex items-start gap-2 rounded-xl border border-border p-3 text-sm"
            key={command.id}
          >
            <input
              className="mt-0.5 size-4 accent-primary"
              defaultChecked={isEnabled}
              name="commandIds"
              type="checkbox"
              value={command.id}
            />
            <span className="min-w-0 flex-1">
              <span className="block font-medium">/{command.name}</span>
              <span className="block text-xs text-muted-foreground">
                {command.description || "No description yet."}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ToolRules({ plugin }: { plugin?: Plugin }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {TOOL_IDS.map((toolId) => {
        const tool = TOOLS[toolId];
        const isEnabled = plugin ? plugin.toolIds.includes(toolId) : false;
        return (
          <div
            className="flex items-start gap-2 rounded-xl border border-border p-3 text-sm"
            key={toolId}
          >
            <input
              className="mt-0.5 size-4 accent-primary"
              defaultChecked={isEnabled}
              name="toolIds"
              type="checkbox"
              value={toolId}
            />
            <span className="min-w-0 flex-1">
              <span className="block font-medium">{tool.name}</span>
              <span className="block text-xs text-muted-foreground">
                {tool.description}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Create or edit one plugin: a distribution unit that bundles existing
 * commands and/or tool grants into one thing an admin can grant to an
 * agent from its settings — see `agent-plugin-grants.ts`.
 */
export function PluginForm({
  plugin,
  commands,
}: {
  plugin?: Plugin;
  commands: Pick<Command, "id" | "name" | "description">[];
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    plugin ? updatePluginAction : createPluginAction,
    initialState,
  );
  const submitLabel = plugin ? "Save plugin" : "Create plugin";
  useEffect(() => {
    if (state.status === "success" && state.href) router.push(state.href);
  }, [router, state.href, state.status]);

  return (
    <form action={action} className="space-y-6">
      {plugin ? (
        <input name="pluginId" type="hidden" value={plugin.id} />
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="plugin-name">Name</Label>
        <Input
          defaultValue={plugin?.name}
          id="plugin-name"
          maxLength={100}
          name="name"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="plugin-description">Description</Label>
        <Input
          defaultValue={plugin?.description}
          id="plugin-description"
          maxLength={300}
          name="description"
          placeholder="What this plugin is for"
        />
      </div>
      <div className="space-y-3">
        <Label>Commands this plugin bundles</Label>
        <CommandRules commands={commands} plugin={plugin} />
      </div>
      <div className="space-y-3">
        <Label>Tools this plugin grants</Label>
        <ToolRules plugin={plugin} />
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
