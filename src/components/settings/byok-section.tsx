import {
  deleteByokCredentialAction,
  setByokCredentialEnabledAction,
} from "@/app/(workspace)/settings/byok-actions";
import {
  CreateByokCredentialDialog,
  EditByokCredentialDialog,
} from "@/components/settings/byok-credential-dialogs";
import { FormSubmitToast } from "@/components/settings/form-submit-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

import type { ByokCredential } from "@/byok/byok-repository";

interface CatalogProvider {
  id: string;
  name: string;
  apiBaseUrl: string | null;
}

function CredentialRow({
  credential,
  providers,
  providerName,
}: {
  credential: ByokCredential;
  providers: CatalogProvider[];
  providerName: string;
}) {
  const enableAction = setByokCredentialEnabledAction.bind(
    null,
    credential.id,
    !credential.enabled,
  );
  const deleteAction = deleteByokCredentialAction.bind(null, credential.id);
  return (
    <Field orientation="vertical">
      <FieldContent>
        <div className="flex items-center gap-2">
          <FieldTitle>{credential.label}</FieldTitle>
          <Badge variant={credential.enabled ? "default" : "outline"}>
            {credential.enabled ? "Enabled" : "Disabled"}
          </Badge>
        </div>
        <FieldDescription>
          {providerName} —{" "}
          {credential.allowedModelIds.length > 0
            ? credential.allowedModelIds.join(", ")
            : "no models selected"}
        </FieldDescription>
      </FieldContent>
      <div className="flex flex-wrap gap-2">
        <EditByokCredentialDialog
          credential={credential}
          providers={providers}
        />
        <form action={enableAction}>
          <Button size="sm" type="submit" variant="ghost">
            {credential.enabled ? "Disable" : "Enable"}
          </Button>
          <FormSubmitToast message="Key updated" />
        </form>
        <form action={deleteAction}>
          <Button size="sm" type="submit" variant="ghost">
            Delete
          </Button>
          <FormSubmitToast message="Key removed" />
        </form>
      </div>
    </Field>
  );
}

/**
 * Personal-scope, unlike every other settings section: each member manages
 * only their own keys, usable either as an explicit per-message pick from
 * the composer or as an automatic fallback once their platform usage
 * allowance is exhausted (`usage-limit-repository.ts`).
 */
export function ByokSection({
  credentials,
  providers,
}: {
  credentials: ByokCredential[];
  providers: CatalogProvider[];
}) {
  const providerNameById = new Map(
    providers.map((provider) => [provider.id, provider.name]),
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your API keys</CardTitle>
        <CardDescription>
          Bring your own key for any provider in the catalog. Pick one
          explicitly from the composer, or leave it enabled as a fallback for
          when your platform usage allowance runs out.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {credentials.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You haven&apos;t added a key yet.
          </p>
        ) : (
          <div className="space-y-4">
            {credentials.map((credential) => (
              <CredentialRow
                credential={credential}
                key={credential.id}
                providerName={
                  providerNameById.get(credential.providerId) ??
                  credential.providerId
                }
                providers={providers}
              />
            ))}
          </div>
        )}
        <CreateByokCredentialDialog providers={providers} />
      </CardContent>
    </Card>
  );
}
