import {
  addOrganizationDomainAction,
  generateDomainVerificationLinkAction,
  renameOrganizationAction,
  updateDefaultAgentAction,
  updateModelPolicyAction,
  verifyOrganizationDomainAction,
} from "@/app/(workspace)/settings/actions";
import { DeleteOrganizationButton } from "@/components/settings/delete-organization-button";
import { Badge } from "@/components/ui/badge";
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

import type { OrganizationDomain } from "@/organizations/local-domain-verification";

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

/**
 * Sends an admin to the WorkOS Admin Portal to verify the organization's
 * email domain. Once verified, teammates who sign up with a matching work
 * email are added automatically, without an invite.
 */
export function DomainVerificationSection() {
  return (
    <Card>
      <form action={generateDomainVerificationLinkAction}>
        <CardHeader>
          <CardTitle>Domain verification</CardTitle>
          <CardDescription>
            Verify your organization&apos;s email domain so teammates who sign
            up with a matching work email join automatically, without an invite.
          </CardDescription>
        </CardHeader>
        <CardFooter className="pt-4">
          <Button type="submit" variant="outline">
            Verify a domain
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

/**
 * Local-workspace equivalent of the WorkOS Admin Portal flow above: add a
 * company domain, prove ownership with a DNS TXT record, and teammates who
 * sign up with a matching email join this workspace automatically.
 */
export function LocalDomainVerificationSection({
  domains,
}: {
  domains: OrganizationDomain[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Domain verification</CardTitle>
        <CardDescription>
          Verify your company&apos;s email domain so teammates who sign up with
          a matching work email join this workspace automatically, without an
          invite.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {domains.length > 0 ? (
          <ul className="space-y-2">
            {domains.map((domain) => (
              <li
                className="flex items-center justify-between gap-2 rounded-md border p-3 text-sm"
                key={domain.id}
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{domain.domain}</p>
                  {domain.status === "pending" ? (
                    <p className="text-xs text-muted-foreground">
                      Add a TXT record with the value{" "}
                      <code className="rounded bg-muted px-1 py-0.5">
                        pilot-domain-verify={domain.verificationToken}
                      </code>
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge
                    variant={
                      domain.status === "verified" ? "default" : "secondary"
                    }
                  >
                    {domain.status === "verified" ? "Verified" : "Pending"}
                  </Badge>
                  {domain.status === "pending" ? (
                    <form action={verifyOrganizationDomainAction}>
                      <input name="domainId" type="hidden" value={domain.id} />
                      <Button size="sm" type="submit" variant="outline">
                        Verify
                      </Button>
                    </form>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>
      <CardFooter className="pt-4">
        <form
          action={addOrganizationDomainAction}
          className="flex w-full items-end gap-2"
        >
          <Field className="flex-1">
            <FieldLabel htmlFor="domain">Add a domain</FieldLabel>
            <Input id="domain" name="domain" placeholder="acme.com" required />
          </Field>
          <Button type="submit" variant="outline">
            Add domain
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}

/**
 * Rename a local workspace. Not offered for the WorkOS-backed SDK
 * Enterprises organization — that name is managed in WorkOS.
 */
export function WorkspaceNameSection({
  organizationName,
}: {
  organizationName: string;
}) {
  return (
    <Card>
      <form action={renameOrganizationAction}>
        <CardHeader>
          <CardTitle>Workspace name</CardTitle>
          <CardDescription>
            Shown to every member of this workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <Field>
            <FieldLabel htmlFor="workspace-name">Name</FieldLabel>
            <Input
              defaultValue={organizationName}
              id="workspace-name"
              maxLength={200}
              name="name"
              required
            />
          </Field>
        </CardContent>
        <CardFooter className="pt-4">
          <Button type="submit" variant="outline">
            Save name
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

/**
 * Permanently delete a local workspace. Owner only, since it destroys every
 * member's data, not just the requester's own.
 */
export function DeleteWorkspaceSection({
  organizationId,
  organizationName,
}: {
  organizationId: string;
  organizationName: string;
}) {
  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle>Delete workspace</CardTitle>
        <CardDescription>
          Permanently deletes this workspace and everything in it for every
          member. This can&apos;t be undone.
        </CardDescription>
      </CardHeader>
      <CardFooter className="pt-4">
        <DeleteOrganizationButton
          organizationId={organizationId}
          organizationName={organizationName}
        />
      </CardFooter>
    </Card>
  );
}
