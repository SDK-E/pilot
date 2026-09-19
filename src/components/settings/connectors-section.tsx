import {
  deleteCustomConnectorAction,
  disconnectCustomConnectorAction,
  disconnectPersonalConnectorConnectionAction,
  seedDefaultConnectorsAction,
  setCustomConnectorEnabledAction,
} from "@/app/(workspace)/settings/connector-actions";
import {
  CreateCustomConnectorDialog,
  EditCustomConnectorDialog,
} from "@/components/settings/connector-definition-dialogs";
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

import type {
  ConnectionSummary,
  ConnectorDefinitionForSettings,
} from "@/connectors/connector-definition-repository";

function statusBadge(status: ConnectionSummary["connectionStatus"]) {
  if (status === "active") {
    return (
      <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
        Connected
      </Badge>
    );
  }
  if (status === "error")
    return <Badge variant="destructive">Needs reconnect</Badge>;
  return <Badge variant="outline">Not connected</Badge>;
}

function OrganizationConnectionRow({
  definition,
  connection,
}: {
  definition: ConnectorDefinitionForSettings;
  connection: ConnectionSummary | undefined;
}) {
  const isConnected = connection?.connectionStatus === "active";
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">Shared connection</span>
        {statusBadge(connection?.connectionStatus ?? "not_connected")}
        {isConnected && connection.accountIdentifier ? (
          <span className="text-xs text-muted-foreground">
            as {connection.accountIdentifier}
          </span>
        ) : null}
      </div>
      {isConnected ? (
        <form action={disconnectCustomConnectorAction}>
          <input name="id" type="hidden" value={definition.id} />
          <Button size="sm" type="submit" variant="ghost">
            Disconnect
          </Button>
          <FormSubmitToast message="Connection removed" />
        </form>
      ) : (
        <a
          className={buttonVariants({ size: "sm", variant: "outline" })}
          href={`/api/connectors/custom/${definition.id}/authorize`}
        >
          Connect
        </a>
      )}
    </div>
  );
}

function PersonalConnectionRow({
  definition,
  connection,
}: {
  definition: ConnectorDefinitionForSettings;
  connection: ConnectionSummary | undefined;
}) {
  const isConnected = connection?.connectionStatus === "active";
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">Your own connection</span>
        {statusBadge(connection?.connectionStatus ?? "not_connected")}
        {isConnected && connection.accountIdentifier ? (
          <span className="text-xs text-muted-foreground">
            as {connection.accountIdentifier}
          </span>
        ) : null}
      </div>
      {isConnected ? (
        <form action={disconnectPersonalConnectorConnectionAction}>
          <input name="id" type="hidden" value={definition.id} />
          <Button size="sm" type="submit" variant="ghost">
            Disconnect
          </Button>
          <FormSubmitToast message="Your connection was removed" />
        </form>
      ) : (
        <a
          className={buttonVariants({ size: "sm", variant: "outline" })}
          href={`/api/connectors/custom/${definition.id}/authorize?scope=personal`}
        >
          Connect
        </a>
      )}
    </div>
  );
}

function CustomConnectorRow({
  definition,
  isAdmin,
  organizationConnection,
  personalConnection,
}: {
  definition: ConnectorDefinitionForSettings;
  isAdmin: boolean;
  organizationConnection: ConnectionSummary | undefined;
  personalConnection: ConnectionSummary | undefined;
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
          {isActive ? null : <Badge variant="outline">Disabled</Badge>}
        </div>
        <FieldDescription>
          {definition.description || "No description."}
        </FieldDescription>
      </FieldContent>
      <div className="space-y-2 rounded-lg border p-3">
        {isAdmin ? (
          <OrganizationConnectionRow
            connection={organizationConnection}
            definition={definition}
          />
        ) : null}
        {definition.allowPersonalConnections ? (
          <PersonalConnectionRow
            connection={personalConnection}
            definition={definition}
          />
        ) : null}
      </div>
      {isAdmin ? (
        <div className="flex flex-wrap gap-2">
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
      ) : null}
    </Field>
  );
}

function EmptyConnectorsState({ isAdmin }: { isAdmin: boolean }) {
  if (!isAdmin) {
    return (
      <p className="text-sm text-muted-foreground">
        No connectors configured yet.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">No connectors yet.</p>
      <form action={seedDefaultConnectorsAction}>
        <Button size="sm" type="submit" variant="outline">
          Add Pilot&apos;s built-in connectors
        </Button>
        <FormSubmitToast message="Built-in connectors added — connect the ones you want to use" />
      </form>
    </div>
  );
}

/**
 * CRUD for every connector: one generic OAuth2 + REST engine drives all of
 * them, whether seeded by Pilot (GitHub, Slack, ...) or added here from
 * scratch. Configuration (org admin-only) is separate from connection state
 * — a connector may have a shared org-wide connection, and, when it allows
 * personal connections, any number of per-member ones alongside it. See
 * docs/decisions/0023-dynamic-connectors.md and
 * docs/decisions/0030-personal-connector-connections.md.
 */
export function ConnectorsSection({
  definitions,
  connectionsByDefinitionId,
  viewerWorkosUserId,
  isAdmin,
}: {
  definitions: ConnectorDefinitionForSettings[];
  connectionsByDefinitionId: Map<string, ConnectionSummary[]>;
  viewerWorkosUserId: string;
  isAdmin: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Connectors</CardTitle>
        <CardDescription>
          Every connector — GitHub, Slack, or one you add yourself — is a
          generic OAuth2 + REST integration. Some offer a shared connection for
          the whole organization, a personal connection just for you, or both.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {definitions.length === 0 ? (
          <EmptyConnectorsState isAdmin={isAdmin} />
        ) : (
          <div className="space-y-4">
            {definitions.map((definition) => {
              const connections =
                connectionsByDefinitionId.get(definition.id) ?? [];
              return (
                <CustomConnectorRow
                  definition={definition}
                  isAdmin={isAdmin}
                  key={definition.id}
                  organizationConnection={connections.find(
                    (connection) => connection.scope === "organization",
                  )}
                  personalConnection={connections.find(
                    (connection) =>
                      connection.scope === "personal" &&
                      connection.ownerWorkosUserId === viewerWorkosUserId,
                  )}
                />
              );
            })}
          </div>
        )}
        {isAdmin ? <CreateCustomConnectorDialog /> : null}
      </CardContent>
    </Card>
  );
}
