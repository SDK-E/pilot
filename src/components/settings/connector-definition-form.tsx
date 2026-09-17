import {
  createCustomConnectorAction,
  updateCustomConnectorAction,
} from "@/app/(workspace)/settings/connector-actions";
import { FormSubmitToast } from "@/components/settings/form-submit-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import type { ConnectorDefinitionForSettings } from "@/connectors/connector-definition-repository";

const EXAMPLE_ACTIONS_JSON = [
  "[",
  "  {",
  '    "id": "search",',
  '    "label": "Search",',
  '    "description": "Search records by keyword.",',
  '    "method": "GET",',
  '    "urlTemplate": "https://api.example.com/v1/search?q={query}&limit={limit}",',
  '    "listPath": "results",',
  '    "idField": "id",',
  '    "titleField": "name",',
  '    "urlField": "url"',
  "  }",
  "]",
].join("\n");

function IdentityFields({
  definition,
}: {
  definition?: ConnectorDefinitionForSettings;
}) {
  if (definition) return null;
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-1.5">
        <Label htmlFor="slug">Slug</Label>
        <Input
          id="slug"
          name="slug"
          pattern="[a-z0-9-]+"
          placeholder="acme-crm"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="icon">Icon (one emoji)</Label>
        <Input id="icon" maxLength={8} name="icon" placeholder="🧩" />
      </div>
    </div>
  );
}

function BasicFields({
  definition,
}: {
  definition?: ConnectorDefinitionForSettings;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="displayName">Display name</Label>
          <Input
            defaultValue={definition?.displayName}
            id="displayName"
            name="displayName"
            placeholder="Acme CRM"
            required
          />
        </div>
        {definition ? (
          <div className="space-y-1.5">
            <Label htmlFor="icon">Icon (one emoji)</Label>
            <Input
              defaultValue={definition.icon ?? ""}
              id="icon"
              maxLength={8}
              name="icon"
              placeholder="🧩"
            />
          </div>
        ) : null}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Input
          defaultValue={definition?.description}
          id="description"
          name="description"
          placeholder="What this connector is for, shown to the agent."
        />
      </div>
    </>
  );
}

function OAuthFields({
  definition,
}: {
  definition?: ConnectorDefinitionForSettings;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="authorizeUrl">Authorize URL</Label>
          <Input
            defaultValue={definition?.authorizeUrl}
            id="authorizeUrl"
            name="authorizeUrl"
            placeholder="https://example.com/oauth/authorize"
            required
            type="url"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tokenUrl">Token URL</Label>
          <Input
            defaultValue={definition?.tokenUrl}
            id="tokenUrl"
            name="tokenUrl"
            placeholder="https://example.com/oauth/token"
            required
            type="url"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="clientId">Client ID</Label>
          <Input
            defaultValue={definition?.clientId}
            id="clientId"
            name="clientId"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="clientSecret">
            Client secret{definition ? " (leave blank to keep current)" : ""}
          </Label>
          <Input
            id="clientSecret"
            name="clientSecret"
            required={!definition}
            type="password"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="scopes">Scopes (space or comma separated)</Label>
        <Input
          defaultValue={definition?.scopes.join(" ")}
          id="scopes"
          name="scopes"
          placeholder="read:contacts read:deals"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="accountIdentifierUrl">
            Account-identity URL (optional)
          </Label>
          <Input
            defaultValue={definition?.accountIdentifierUrl ?? ""}
            id="accountIdentifierUrl"
            name="accountIdentifierUrl"
            placeholder="https://example.com/api/me"
            type="url"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="accountIdentifierField">
            Account-identity field (dot-path)
          </Label>
          <Input
            defaultValue={definition?.accountIdentifierField ?? ""}
            id="accountIdentifierField"
            name="accountIdentifierField"
            placeholder="team.name"
          />
        </div>
      </div>
    </>
  );
}

function ActionsField({
  definition,
}: {
  definition?: ConnectorDefinitionForSettings;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor="actionsJson">Actions (JSON array)</Label>
      <Textarea
        className="h-40 font-mono text-xs"
        defaultValue={
          definition
            ? JSON.stringify(definition.actions, null, 2)
            : EXAMPLE_ACTIONS_JSON
        }
        id="actionsJson"
        name="actionsJson"
        spellCheck={false}
      />
      <p className="text-xs text-muted-foreground">
        Each action becomes something the agent can call: id, label,
        description, method, urlTemplate, bodyTemplate?, listPath?,
        nextCursorPath?, idField?, titleField?, urlField?, isMutating?. Use
        curly-brace placeholders in urlTemplate/bodyTemplate for values the
        agent supplies. Set isMutating: true for any action with a side effect —
        the agent must confirm with the user before it actually runs.
      </p>
    </div>
  );
}

function DefinitionFormFields({
  definition,
}: {
  definition?: ConnectorDefinitionForSettings;
}) {
  return (
    <div className="space-y-4">
      <IdentityFields definition={definition} />
      <BasicFields definition={definition} />
      <OAuthFields definition={definition} />
      <ActionsField definition={definition} />
    </div>
  );
}

export function CreateCustomConnectorDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Add custom connector
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <form action={createCustomConnectorAction}>
          <DialogHeader>
            <DialogTitle>Add a custom connector</DialogTitle>
            <DialogDescription>
              A generic OAuth2 + REST integration your agents can call,
              configured here instead of shipped as code.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <DefinitionFormFields />
          </div>
          <DialogFooter>
            <Button type="submit">Create connector</Button>
            <FormSubmitToast message="Custom connector created" />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EditCustomConnectorDialog({
  definition,
}: {
  definition: ConnectorDefinitionForSettings;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <form action={updateCustomConnectorAction}>
          <input name="id" type="hidden" value={definition.id} />
          <DialogHeader>
            <DialogTitle>Edit {definition.displayName}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <DefinitionFormFields definition={definition} />
          </div>
          <DialogFooter>
            <Button type="submit">Save changes</Button>
            <FormSubmitToast message="Custom connector updated" />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
