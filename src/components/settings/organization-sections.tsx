import {
  updateDefaultAgentAction,
  updateModelPolicyAction,
} from "@/app/(workspace)/settings/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

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
    <Card>
      <form action={updateDefaultAgentAction}>
        <CardHeader>
          <CardTitle>Default agent</CardTitle>
          <CardDescription>
            Preselected when someone in the organization starts a conversation
            in that agent&apos;s mode.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {agents.length > 0 ? (
            <Field>
              <FieldLabel htmlFor="default-agent">Agent</FieldLabel>
              <Select
                defaultValue={defaultAgentId ?? agents[0]?.id}
                name="agentId"
              >
                <SelectTrigger className="w-64" id="default-agent">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          ) : (
            <p className="text-xs text-muted-foreground">
              Agents are created the first time each mode is used.
            </p>
          )}
        </CardContent>
        {agents.length > 0 ? (
          <CardFooter className="pt-4">
            <Button type="submit" variant="outline">
              Save default agent
            </Button>
          </CardFooter>
        ) : null}
      </form>
    </Card>
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
    <Card>
      <form action={updateModelPolicyAction}>
        <CardHeader>
          <CardTitle>Model policy</CardTitle>
          <CardDescription>
            The primary Kilo Gateway model. Pilot can retry a failed reply once
            with the free model.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="primary-model">Primary model</FieldLabel>
              <Input
                className="font-mono"
                defaultValue={primaryModelId}
                id="primary-model"
                name="primaryModelId"
                required
              />
            </Field>
            <Field orientation="horizontal">
              <FieldContent>
                <FieldTitle>Retry once with the free model</FieldTitle>
                <FieldDescription>
                  When the primary model fails, send the message again through
                  kilo-auto/free before reporting an error.
                </FieldDescription>
              </FieldContent>
              <Switch
                aria-label="Retry once with the free model"
                defaultChecked={retryEnabled}
                name="retryEnabled"
                value="true"
              />
            </Field>
          </FieldGroup>
        </CardContent>
        <CardFooter className="pt-4">
          <Button type="submit" variant="outline">
            Save model policy
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
