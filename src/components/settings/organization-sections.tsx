import {
  updateDefaultAgentAction,
  updateModelPolicyAction,
} from "@/app/(workspace)/settings/actions";
import { Button } from "@/components/ui/button";

export const settingsSectionClass =
  "rounded-2xl border border-border bg-card/50 p-5";
export const settingsSelectClass =
  "h-9 min-w-52 rounded-xl border border-border bg-background px-3 text-sm";

/**
 * Which agent is preselected when a member starts a conversation.
 */
export function DefaultAgentSection({
  defaultAgentId,
  agents,
}: {
  defaultAgentId: string | null;
  agents: { id: string; name: string }[];
}) {
  return (
    <section className={settingsSectionClass}>
      <h2 className="font-medium">Default agent</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Preselected when someone in the organization starts a conversation in
        that agent&apos;s mode.
      </p>
      {agents.length > 0 ? (
        <form
          action={updateDefaultAgentAction}
          className="mt-4 flex flex-wrap gap-3"
        >
          <select
            className={settingsSelectClass}
            defaultValue={defaultAgentId ?? agents[0]?.id}
            name="agentId"
          >
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
          <Button type="submit" variant="outline">
            Save default agent
          </Button>
        </form>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          Agents are created the first time each mode is used.
        </p>
      )}
    </section>
  );
}

/**
 * The organization's primary model and retry behaviour. Admins only.
 */
export function ModelPolicySection({
  primaryModelId,
  retryEnabled,
}: {
  primaryModelId: string;
  retryEnabled: boolean;
}) {
  return (
    <section className={settingsSectionClass}>
      <h2 className="font-medium">Model policy</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        The primary Kilo Gateway model. Pilot can retry a failed reply once with{" "}
        <code>kilo-auto/free</code>.
      </p>
      <form action={updateModelPolicyAction} className="mt-4 space-y-3">
        <input
          className="h-9 w-full rounded-xl border border-input bg-background px-3 text-sm"
          defaultValue={primaryModelId}
          name="primaryModelId"
          required
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            defaultChecked={retryEnabled}
            name="retryEnabled"
            type="checkbox"
            value="true"
          />
          Retry once with Free
        </label>
        <Button type="submit" variant="outline">
          Save model policy
        </Button>
      </form>
    </section>
  );
}
