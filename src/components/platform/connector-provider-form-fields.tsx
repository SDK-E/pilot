import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import type { ConnectorProviderForAdmin } from "@/platform/connector-provider-repository";

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

export interface ProviderDraft {
  slug: string;
  icon: string;
  displayName: string;
  description: string;
  authorizeUrl: string;
  tokenUrl: string;
  clientId: string;
  scopes: string;
  accountIdentifierUrl: string;
  accountIdentifierField: string;
  actionsJson: string;
}

export function emptyDraft(): ProviderDraft {
  return {
    slug: "",
    icon: "",
    displayName: "",
    description: "",
    authorizeUrl: "",
    tokenUrl: "",
    clientId: "",
    scopes: "",
    accountIdentifierUrl: "",
    accountIdentifierField: "",
    actionsJson: EXAMPLE_ACTIONS_JSON,
  };
}

export function draftFromProvider(
  provider: ConnectorProviderForAdmin,
): ProviderDraft {
  return {
    slug: provider.slug,
    icon: provider.icon ?? "",
    displayName: provider.displayName,
    description: provider.description,
    authorizeUrl: provider.authorizeUrl,
    tokenUrl: provider.tokenUrl,
    clientId: provider.clientId,
    scopes: provider.scopes.join(" "),
    accountIdentifierUrl: provider.accountIdentifierUrl ?? "",
    accountIdentifierField: provider.accountIdentifierField ?? "",
    actionsJson: JSON.stringify(provider.actions, null, 2),
  };
}

interface FieldsProps {
  draft: ProviderDraft;
  onChange: (patch: Partial<ProviderDraft>) => void;
}

export function BasicFields({
  draft,
  isEditing,
  onChange,
}: FieldsProps & { isEditing: boolean }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        {isEditing ? null : (
          <div className="space-y-1.5">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              name="slug"
              onChange={(event) => {
                onChange({ slug: event.currentTarget.value });
              }}
              pattern="[a-z0-9-]+"
              placeholder="github"
              required
              value={draft.slug}
            />
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="icon">Icon (one emoji)</Label>
          <Input
            id="icon"
            maxLength={8}
            name="icon"
            onChange={(event) => {
              onChange({ icon: event.currentTarget.value });
            }}
            placeholder="🧩"
            value={draft.icon}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="displayName">Display name</Label>
        <Input
          id="displayName"
          name="displayName"
          onChange={(event) => {
            onChange({ displayName: event.currentTarget.value });
          }}
          placeholder="GitHub"
          required
          value={draft.displayName}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          name="description"
          onChange={(event) => {
            onChange({ description: event.currentTarget.value });
          }}
          placeholder="What this provider is for, shown to admins."
          value={draft.description}
        />
      </div>
    </>
  );
}

export function OAuthFields({ draft, onChange }: FieldsProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-1.5">
        <Label htmlFor="authorizeUrl">Authorize URL</Label>
        <Input
          id="authorizeUrl"
          name="authorizeUrl"
          onChange={(event) => {
            onChange({ authorizeUrl: event.currentTarget.value });
          }}
          placeholder="https://example.com/oauth/authorize"
          required
          type="url"
          value={draft.authorizeUrl}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="tokenUrl">Token URL</Label>
        <Input
          id="tokenUrl"
          name="tokenUrl"
          onChange={(event) => {
            onChange({ tokenUrl: event.currentTarget.value });
          }}
          placeholder="https://example.com/oauth/token"
          required
          type="url"
          value={draft.tokenUrl}
        />
      </div>
    </div>
  );
}

export function ClientFields({
  draft,
  isEditing,
  onChange,
}: FieldsProps & { isEditing: boolean }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="clientId">Client ID</Label>
          <Input
            id="clientId"
            name="clientId"
            onChange={(event) => {
              onChange({ clientId: event.currentTarget.value });
            }}
            required
            value={draft.clientId}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="clientSecret">
            Client secret{isEditing ? " (leave blank to keep current)" : ""}
          </Label>
          <Input
            id="clientSecret"
            name="clientSecret"
            required={!isEditing}
            type="password"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="scopes">Scopes (space or comma separated)</Label>
        <Input
          id="scopes"
          name="scopes"
          onChange={(event) => {
            onChange({ scopes: event.currentTarget.value });
          }}
          placeholder="repo"
          value={draft.scopes}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="accountIdentifierUrl">
            Account-identity URL (optional)
          </Label>
          <Input
            id="accountIdentifierUrl"
            name="accountIdentifierUrl"
            onChange={(event) => {
              onChange({ accountIdentifierUrl: event.currentTarget.value });
            }}
            placeholder="https://example.com/api/me"
            type="url"
            value={draft.accountIdentifierUrl}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="accountIdentifierField">
            Account-identity field (dot-path)
          </Label>
          <Input
            id="accountIdentifierField"
            name="accountIdentifierField"
            onChange={(event) => {
              onChange({ accountIdentifierField: event.currentTarget.value });
            }}
            placeholder="login"
            value={draft.accountIdentifierField}
          />
        </div>
      </div>
    </>
  );
}

export function ActionsField({ draft, onChange }: FieldsProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor="actionsJson">Actions (JSON array)</Label>
      <Textarea
        className="h-40 font-mono text-xs"
        id="actionsJson"
        name="actionsJson"
        onChange={(event) => {
          onChange({ actionsJson: event.currentTarget.value });
        }}
        spellCheck={false}
        value={draft.actionsJson}
      />
      <p className="text-xs text-muted-foreground">
        Each action becomes something an org&apos;s agent can call: id, label,
        description, method, urlTemplate, bodyTemplate?, listPath?,
        nextCursorPath?, idField?, titleField?, urlField?, isMutating?. Use
        curly-brace placeholders in urlTemplate/bodyTemplate for values the
        agent supplies. Set isMutating: true for any action with a side effect —
        the agent must confirm with the user before it runs.
      </p>
    </div>
  );
}
