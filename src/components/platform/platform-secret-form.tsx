"use client";

import { useActionState } from "react";

import {
  deleteGithubMarketplaceWebhookSecretAction,
  setGithubMarketplaceWebhookSecretAction,
  type ConnectorProviderFormState,
} from "@/app/admin/connector-providers/actions";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const initialState: ConnectorProviderFormState = { status: "idle" };

export function PlatformSecretForm({
  label,
  description,
  configured,
}: {
  label: string;
  description: string;
  configured: boolean;
}) {
  const [state, action, isPending] = useActionState(
    setGithubMarketplaceWebhookSecretAction,
    initialState,
  );

  return (
    <Field className="rounded-xl border p-4" orientation="vertical">
      <FieldContent>
        <div className="flex items-center gap-2">
          <FieldTitle>{label}</FieldTitle>
          {configured ? (
            <span className="text-xs text-emerald-600 dark:text-emerald-400">
              Configured
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">
              Not configured
            </span>
          )}
        </div>
        <FieldDescription>{description}</FieldDescription>
      </FieldContent>
      <form action={action} className="flex flex-wrap items-center gap-3">
        <Input
          className="max-w-sm"
          name="value"
          placeholder={configured ? "••••••••••••" : "Paste the value"}
          required
          type="password"
        />
        <Button disabled={isPending} size="sm" type="submit">
          {isPending ? "Saving…" : "Save"}
        </Button>
        {configured ? (
          <form action={deleteGithubMarketplaceWebhookSecretAction}>
            <Button size="sm" type="submit" variant="ghost">
              Remove
            </Button>
          </form>
        ) : null}
        {state.message ? (
          <p
            className={
              state.status === "error"
                ? "text-sm text-destructive"
                : "text-sm text-primary"
            }
          >
            {state.message}
          </p>
        ) : null}
      </form>
    </Field>
  );
}
