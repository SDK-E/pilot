import {
  addOrganizationDomainAction,
  generateDomainVerificationLinkAction,
  renameOrganizationAction,
  updateDefaultAgentAction,
  verifyOrganizationDomainAction,
} from "@/app/(workspace)/settings/actions";
import { DeleteOrganizationButton } from "@/components/settings/delete-organization-button";
import { FormSubmitToast } from "@/components/settings/form-submit-toast";
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
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { OrganizationDomain } from "@/organizations/local-domain-verification";

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
                key={defaultAgentId ?? agents[0]?.id}
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
            <FormSubmitToast message="Default agent saved" />
          </CardFooter>
        ) : null}
      </form>
    </Card>
  );
}

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
                      <FormSubmitToast message="Domain re-checked" />
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
          <FormSubmitToast message="Domain added" />
        </form>
      </CardFooter>
    </Card>
  );
}

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
              key={organizationName}
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
          <FormSubmitToast message="Workspace name saved" />
        </CardFooter>
      </form>
    </Card>
  );
}

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
