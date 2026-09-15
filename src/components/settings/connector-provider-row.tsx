import {
  disconnectConnectorConnectionAction,
  setDefaultConnectorConnectionAction,
} from "@/app/(workspace)/settings/actions";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldTitle,
} from "@/components/ui/field";

import type { ConnectorProvider } from "@/connectors/connector-providers";
import type { ConnectionSummary } from "@/connectors/connector-repository";

/**
 * One provider's row in the Connectors section: connect links when the
 * viewer has no connection for it yet, or the connected account(s) with
 * disconnect/make-default actions when they do.
 */
export function ConnectorProviderRow({
  provider,
  description,
  isAdmin,
  personalConnections,
  organizationConnections,
}: {
  provider: ConnectorProvider;
  description: string;
  isAdmin: boolean;
  personalConnections: ConnectionSummary[];
  organizationConnections: ConnectionSummary[];
}) {
  const connections = [...organizationConnections, ...personalConnections];
  const hasAny = connections.length > 0;

  return (
    <Field orientation="vertical">
      <FieldContent>
        <FieldTitle>{provider.displayName}</FieldTitle>
        <FieldDescription>{description}</FieldDescription>
      </FieldContent>
      {hasAny ? (
        <ul className="space-y-2">
          {connections.map((connection) => (
            <ConnectedRow
              connection={connection}
              hasSiblings={personalConnections.length > 1}
              key={connection.id}
            />
          ))}
        </ul>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <a
          className={buttonVariants({ size: "sm", variant: "outline" })}
          href={`/api/connectors/${provider.id}/authorize?scope=user`}
        >
          Connect
        </a>
        {provider.supportsOrgScope && isAdmin ? (
          <a
            className={buttonVariants({ size: "sm", variant: "outline" })}
            href={`/api/connectors/${provider.id}/authorize?scope=organization`}
          >
            Connect for organization
          </a>
        ) : null}
      </div>
    </Field>
  );
}

function ConnectedRow({
  connection,
  hasSiblings,
}: {
  connection: ConnectionSummary;
  hasSiblings: boolean;
}) {
  return (
    <li className="flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-sm">
      <span className="font-medium">{connection.accountIdentifier}</span>
      {connection.isDefault ? <Badge variant="secondary">Default</Badge> : null}
      {connection.status === "error" ? (
        <Badge variant="destructive">Needs reconnect</Badge>
      ) : null}
      <div className="ml-auto flex gap-2">
        {!connection.isDefault && hasSiblings ? (
          <form action={setDefaultConnectorConnectionAction}>
            <input name="connectionId" type="hidden" value={connection.id} />
            <Button size="sm" type="submit" variant="ghost">
              Make default
            </Button>
          </form>
        ) : null}
        <form action={disconnectConnectorConnectionAction}>
          <input name="connectionId" type="hidden" value={connection.id} />
          <Button size="sm" type="submit" variant="ghost">
            Disconnect
          </Button>
        </form>
      </div>
    </li>
  );
}
