import { AGENT_KINDS, type AgentKindId } from "@/agents/agent-kinds";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="agent-name">Name</FieldLabel>
        <Input
          defaultValue={agent?.name}
          id="agent-name"
          maxLength={100}
          name="name"
          placeholder={defaultAgent.name}
          required
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="agent-instructions">Instructions</FieldLabel>
        <Textarea
          defaultValue={agent?.instructions}
          id="agent-instructions"
          maxLength={10_000}
          name="instructions"
          placeholder={defaultAgent.instructions}
          required
          rows={6}
        />
        <FieldDescription>
          What the agent is for and how it should work. Sent with every message.
        </FieldDescription>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="agent-goals">Goals</FieldLabel>
          <Textarea
            defaultValue={agent?.goals ?? undefined}
            id="agent-goals"
            maxLength={5000}
            name="goals"
            placeholder="Optional outcomes to optimize for."
            rows={3}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="agent-output-format">Output format</FieldLabel>
          <Textarea
            defaultValue={agent?.outputFormat ?? undefined}
            id="agent-output-format"
            maxLength={1000}
            name="outputFormat"
            placeholder="Optional, such as concise Markdown with sources."
            rows={3}
          />
        </Field>
      </div>
      <Field>
        <FieldLabel htmlFor="agent-tone">Tone</FieldLabel>
        <Input
          defaultValue={agent?.tone ?? undefined}
          id="agent-tone"
          maxLength={200}
          name="tone"
          placeholder="Clear and pragmatic"
        />
      </Field>
    </FieldGroup>
  );
}
