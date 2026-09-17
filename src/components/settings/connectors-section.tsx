import {
  deleteCustomConnectorAction,
  disconnectCustomConnectorAction,
  seedDefaultConnectorsAction,
  setCustomConnectorEnabledAction,
} from "@/app/(workspace)/settings/connector-actions";
import {
  CreateCustomConnectorDialog,
  EditCustomConnectorDialog,
} from "@/components/settings/connector-definition-form";
import { FormSubmitToast } from "@/components/settings/form-submit-toast";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldTitle,
} from "@/components/ui/field";

import type { ConnectorDefinitionForSettings } from "@/connectors/connector-definition-repository";

function StatusBadge({
  definition,
}: {
  definition: ConnectorDefinitionForSettings;
}) {
  if (definition.definitionStatus === "disabled") {
    return <Badge variant="outline">Disabled</Badge>;
  }
  if (definition.connectionStatus === "active") {
    return (
      <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
        Connected
      </Badge>
    );
  }
  if (definition.connectionStatus === "error") {
    return <Badge variant="destructive">Needs reconnect</Badge>;
  }
  return <Badge variant="outline">Not connected</Badge>;
}

function ConnectAction({
  definition,
}: {
  definition: ConnectorDefinitionForSettings;
}) {
  if (definition.connectionStatus === "active") {
    return (
      <form action={disconnectCustomConnectorAction}>
        <input name="id" type="hidden" value={definition.id} />
        <Button size="sm" type="submit" variant="ghost">
          Disconnect
        </Button>
        <FormSubmitToast message="Connection removed" />
      </form>
    );
  }
  return (
    <a
      className={buttonVariants({ size: "sm", variant: "outline" })}
      href={`/api/connectors/custom/${definition.id}/authorize`}
    >
      Connect
    </a>
  );
}

function CustomConnectorRow({
  definition,
}: {
  definition: ConnectorDefinitionForSettings;
}) {
  const isActive = definition.definitionStatus === "active";
  return (
    <Field orientation="vertical">
      <FieldContent>
        <div className="flex items-center gap-2">
          <span aria-hidden className="text-base">
            {definition.icon?.trim() ? definition.icon : "🧩"}
          </span>
          <FieldTitle>{definition.displayName}</FieldTitle>
          <StatusBadge definition={definition} />
        </div>
        <FieldDescription>
          {definition.description || "No description."}
          {definition.accountIdentifier
            ? ` — connected as ${definition.accountIdentifier}`
            : ""}
        </FieldDescription>
      </FieldContent>
      <div className="flex flex-wrap gap-2">
        <ConnectAction definition={definition} />
        <EditCustomConnectorDialog definition={definition} />
        <form action={setCustomConnectorEnabledAction}>
          <input name="id" type="hidden" value={definition.id} />
          <input
            name="enabled"
            type="hidden"
            value={isActive ? "false" : "true"}
          />
          <Button size="sm" type="submit" variant="ghost">
            {isActive ? "Disable" : "Enable"}
          </Button>
          <FormSubmitToast message="Custom connector updated" />
        </form>
        <form action={deleteCustomConnectorAction}>
          <input name="id" type="hidden" value={definition.id} />
          <Button size="sm" type="submit" variant="ghost">
            Delete
          </Button>
          <FormSubmitToast message="Custom connector deleted" />
        </form>
      </div>
    </Field>
  );
}

/**
 * Admin-only CRUD for every connector: one generic OAuth2 + REST engine
 * drives all of them, whether seeded by Pilot (GitHub, Slack, ...) or added
 * here from scratch. See docs/decisions/0023-dynamic-connectors.md.
 */
export function ConnectorsSection({
  definitions,
}: {
  definitions: ConnectorDefinitionForSettings[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Connectors</CardTitle>
        <CardDescription>
          Every connector — GitHub, Slack, or one you add yourself — is a
          generic OAuth2 + REST integration configured here. Org-wide only — one
          connection per connector, shared by every member.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {definitions.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">No connectors yet.</p>
            <form action={seedDefaultConnectorsAction}>
              <Button size="sm" type="submit" variant="outline">
                Add Pilot&apos;s built-in connectors
              </Button>
              <FormSubmitToast message="Built-in connectors added — connect the ones you want to use" />
            </form>
          </div>
        ) : (
          <div className="space-y-4">
            {definitions.map((definition) => (
              <CustomConnectorRow definition={definition} key={definition.id} />
            ))}
          </div>
        )}
        <CreateCustomConnectorDialog />
      </CardContent>
    </Card>
  );
}
