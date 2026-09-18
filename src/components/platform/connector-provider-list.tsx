import {
  deleteConnectorProviderAction,
  setConnectorProviderEnabledAction,
} from "@/app/admin/connector-providers/actions";
import {
  CreateConnectorProviderDialog,
  EditConnectorProviderDialog,
} from "@/components/platform/connector-provider-form";
import { FormSubmitToast } from "@/components/settings/form-submit-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldTitle,
} from "@/components/ui/field";

import type { ConnectorProviderForAdmin } from "@/platform/connector-provider-repository";

function ProviderRow({ provider }: { provider: ConnectorProviderForAdmin }) {
  return (
    <Field className="rounded-xl border p-4" orientation="vertical">
      <FieldContent>
        <div className="flex items-center gap-2">
          <span aria-hidden className="text-base">
            {provider.icon?.trim() ? provider.icon : "🧩"}
          </span>
          <FieldTitle>{provider.displayName}</FieldTitle>
          <span className="text-xs text-muted-foreground">{provider.slug}</span>
          {provider.enabled ? (
            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              Enabled
            </Badge>
          ) : (
            <Badge variant="outline">Disabled</Badge>
          )}
          <span className="text-xs text-emerald-600 dark:text-emerald-400">
            Configured
          </span>
        </div>
        <FieldDescription>
          {provider.description || "No description."}
        </FieldDescription>
      </FieldContent>
      <div className="flex flex-wrap gap-2">
        <EditConnectorProviderDialog provider={provider} />
        <form action={setConnectorProviderEnabledAction}>
          <input name="id" type="hidden" value={provider.id} />
          <input
            name="enabled"
            type="hidden"
            value={provider.enabled ? "false" : "true"}
          />
          <Button size="sm" type="submit" variant="ghost">
            {provider.enabled ? "Disable" : "Enable"}
          </Button>
          <FormSubmitToast message="Connector provider updated" />
        </form>
        <form action={deleteConnectorProviderAction}>
          <input name="id" type="hidden" value={provider.id} />
          <Button size="sm" type="submit" variant="ghost">
            Delete
          </Button>
          <FormSubmitToast message="Connector provider deleted" />
        </form>
      </div>
    </Field>
  );
}

/**
 * Superadmin-only CRUD for every platform connector provider — the full
 * config an organization can seed into its own connector_definitions, not
 * just credentials for a fixed list. See
 * docs/decisions/0024-platform-managed-secrets.md.
 */
export function ConnectorProvidersSection({
  providers,
}: {
  providers: ConnectorProviderForAdmin[];
}) {
  return (
    <div className="space-y-3">
      {providers.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No connector providers yet.
        </p>
      ) : (
        <div className="space-y-3">
          {providers.map((provider) => (
            <ProviderRow key={provider.id} provider={provider} />
          ))}
        </div>
      )}
      <CreateConnectorProviderDialog />
    </div>
  );
}
