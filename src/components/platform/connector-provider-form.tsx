"use client";

import { useActionState } from "react";

import {
  deleteConnectorProviderCredentialAction,
  setConnectorProviderCredentialAction,
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
import { Label } from "@/components/ui/label";

const initialState: ConnectorProviderFormState = { status: "idle" };

export function ConnectorProviderForm({
  slug,
  displayName,
  icon,
  clientId,
}: {
  slug: string;
  displayName: string;
  icon: string;
  clientId?: string;
}) {
  const [state, action, isPending] = useActionState(
    setConnectorProviderCredentialAction,
    initialState,
  );

  return (
    <Field className="rounded-xl border p-4" orientation="vertical">
      <FieldContent>
        <div className="flex items-center gap-2">
          <span aria-hidden className="text-base">
            {icon}
          </span>
          <FieldTitle>{displayName}</FieldTitle>
          {clientId ? (
            <span className="text-xs text-emerald-600 dark:text-emerald-400">
              Configured
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">
              Not configured
            </span>
          )}
        </div>
        <FieldDescription>
          Shared OAuth app credentials every organization&apos;s seeded{" "}
          {displayName} connector uses.
        </FieldDescription>
      </FieldContent>
      <form action={action} className="grid gap-3 sm:grid-cols-2">
        <input name="slug" type="hidden" value={slug} />
        <div className="space-y-1.5">
          <Label htmlFor={`${slug}-client-id`}>Client ID</Label>
          <Input
            defaultValue={clientId}
            id={`${slug}-client-id`}
            name="clientId"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${slug}-client-secret`}>
            Client secret{clientId ? " (leave blank to keep current)" : ""}
          </Label>
          <Input
            id={`${slug}-client-secret`}
            name="clientSecret"
            required={!clientId}
            type="password"
          />
        </div>
        <div className="flex items-center gap-2 sm:col-span-2">
          <Button disabled={isPending} size="sm" type="submit">
            {isPending ? "Saving…" : "Save"}
          </Button>
          {clientId ? (
            <form action={deleteConnectorProviderCredentialAction}>
              <input name="slug" type="hidden" value={slug} />
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
        </div>
      </form>
    </Field>
  );
}
