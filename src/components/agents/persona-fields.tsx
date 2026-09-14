import { AGENT_KINDS, type AgentKindId } from "@/agents/agent-kinds";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import type { Agent } from "@/agents/agent-repository";

/**
 * The text fields that shape how an agent behaves: name, instructions,
 * goals, output format, and tone.
 */
export function PersonaFields({
  agent,
  kind,
}: {
  agent?: Agent;
  kind: AgentKindId;
}) {
  const { defaultAgent } = AGENT_KINDS[kind];
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="agent-name">Name</Label>
        <Input
          defaultValue={agent?.name}
          id="agent-name"
          maxLength={100}
          name="name"
          placeholder={defaultAgent.name}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="agent-instructions">Instructions</Label>
        <Textarea
          defaultValue={agent?.instructions}
          id="agent-instructions"
          maxLength={10_000}
          name="instructions"
          placeholder={defaultAgent.instructions}
          required
          rows={6}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="agent-goals">Goals</Label>
          <Textarea
            defaultValue={agent?.goals ?? undefined}
            id="agent-goals"
            maxLength={5000}
            name="goals"
            placeholder="Optional outcomes to optimize for."
            rows={3}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="agent-output-format">Output format</Label>
          <Textarea
            defaultValue={agent?.outputFormat ?? undefined}
            id="agent-output-format"
            maxLength={1000}
            name="outputFormat"
            placeholder="Optional, such as concise Markdown with sources."
            rows={3}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="agent-tone">Tone</Label>
        <Input
          defaultValue={agent?.tone ?? undefined}
          id="agent-tone"
          maxLength={200}
          name="tone"
          placeholder="Clear and pragmatic"
        />
      </div>
    </>
  );
}
