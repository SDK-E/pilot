"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  createConnectorProvider,
  deleteConnectorProvider,
  setConnectorProviderEnabled,
  updateConnectorProvider,
} from "@/platform/connector-provider-repository";
import {
  deletePlatformSecret,
  setPlatformSecret,
} from "@/platform/platform-secret-repository";
import {
  requirePlatformAdmin,
  requireSuperadmin,
} from "@/platform/platform-session";

export interface ConnectorProviderFormState {
  status: "idle" | "error" | "success";
  message?: string;
}

/**
 * A blank text field means "not provided," same as it being absent.
 */
function formValue(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value : undefined;
}

const actionSchema = z.object({
  id: z.string().trim().min(1).max(100),
  label: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(500),
  method: z.enum(["GET", "POST"]),
  urlTemplate: z.string().trim().min(1).max(2000),
  bodyTemplate: z.string().trim().max(4000).optional(),
  listPath: z.string().trim().max(200).optional(),
  nextCursorPath: z.string().trim().max(200).optional(),
  idField: z.string().trim().max(100).optional(),
  titleField: z.string().trim().max(100).optional(),
  urlField: z.string().trim().max(100).optional(),
  isMutating: z.boolean().optional(),
});

function parseActionsJson(
  raw: string | undefined,
): z.infer<typeof actionSchema>[] {
  if (!raw?.trim()) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Actions must be valid JSON — an array of action objects.");
  }
  const result = z.array(actionSchema).safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `Actions JSON doesn't match the expected shape: ${result.error.issues[0]?.message ?? "invalid"}.`,
    );
  }
  return result.data;
}

const providerFieldsSchema = z.object({
  displayName: z.string().trim().min(1).max(200),
  icon: z.string().trim().max(8).optional(),
  description: z.string().trim().max(500).optional(),
  authorizeUrl: z.url().max(2000),
  tokenUrl: z.url().max(2000),
  scopes: z.string().trim().max(2000).optional(),
  scopeDelimiter: z.enum([" ", ","]).default(" "),
  clientId: z.string().trim().min(1).max(500),
  accountIdentifierUrl: z.url().max(2000).optional(),
  accountIdentifierField: z.string().trim().max(200).optional(),
  actionsJson: z.string().max(20_000).optional(),
});
type ProviderFields = z.infer<typeof providerFieldsSchema>;

function parseProviderFields(formData: FormData): ProviderFields {
  return providerFieldsSchema.parse({
    displayName: formData.get("displayName"),
    icon: formValue(formData, "icon"),
    description: formValue(formData, "description"),
    authorizeUrl: formData.get("authorizeUrl"),
    tokenUrl: formData.get("tokenUrl"),
    scopes: formValue(formData, "scopes"),
    scopeDelimiter: formValue(formData, "scopeDelimiter") ?? " ",
    clientId: formData.get("clientId"),
    accountIdentifierUrl: formValue(formData, "accountIdentifierUrl"),
    accountIdentifierField: formValue(formData, "accountIdentifierField"),
    actionsJson: formValue(formData, "actionsJson"),
  });
}

function splitScopes(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(/[,\s]+/)
    .map((scope) => scope.trim())
    .filter(Boolean);
}

/**
 * Creates a platform-level connector provider: the full config every
 * organization can seed into its own connector_definitions. Superadmin-only
 * — see docs/decisions/0024-platform-managed-secrets.md.
 */
export async function createConnectorProviderAction(formData: FormData) {
  const session = await requirePlatformAdmin();
  requireSuperadmin(session);
  const slug = z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers, and hyphens only.")
    .parse(formData.get("slug"));
  const fields = parseProviderFields(formData);
  const clientSecret = z
    .string()
    .trim()
    .min(1, "A client secret is required.")
    .max(2000)
    .parse(formData.get("clientSecret"));

  await createConnectorProvider({
    slug,
    displayName: fields.displayName,
    icon: fields.icon ?? null,
    description: fields.description ?? "",
    authorizeUrl: fields.authorizeUrl,
    tokenUrl: fields.tokenUrl,
    scopes: splitScopes(fields.scopes),
    scopeDelimiter: fields.scopeDelimiter,
    clientId: fields.clientId,
    clientSecret,
    accountIdentifierUrl: fields.accountIdentifierUrl ?? null,
    accountIdentifierField: fields.accountIdentifierField ?? null,
    actions: parseActionsJson(fields.actionsJson),
    updatedByWorkosUserId: session.user.id,
  });
  revalidatePath("/admin/connector-providers");
}

export async function updateConnectorProviderAction(formData: FormData) {
  const session = await requirePlatformAdmin();
  requireSuperadmin(session);
  const id = z.uuid().parse(formData.get("id"));
  const fields = parseProviderFields(formData);
  const clientSecret = formValue(formData, "clientSecret") ?? null;

  await updateConnectorProvider({
    id,
    displayName: fields.displayName,
    icon: fields.icon ?? null,
    description: fields.description ?? "",
    authorizeUrl: fields.authorizeUrl,
    tokenUrl: fields.tokenUrl,
    scopes: splitScopes(fields.scopes),
    scopeDelimiter: fields.scopeDelimiter,
    clientId: fields.clientId,
    clientSecret,
    accountIdentifierUrl: fields.accountIdentifierUrl ?? null,
    accountIdentifierField: fields.accountIdentifierField ?? null,
    actions: parseActionsJson(fields.actionsJson),
    updatedByWorkosUserId: session.user.id,
  });
  revalidatePath("/admin/connector-providers");
}

export async function setConnectorProviderEnabledAction(formData: FormData) {
  const session = await requirePlatformAdmin();
  requireSuperadmin(session);
  const id = z.uuid().parse(formData.get("id"));
  const isEnabled = formData.get("enabled") === "true";
  await setConnectorProviderEnabled(id, isEnabled);
  revalidatePath("/admin/connector-providers");
}

export async function deleteConnectorProviderAction(formData: FormData) {
  const session = await requirePlatformAdmin();
  requireSuperadmin(session);
  const id = z.uuid().parse(formData.get("id"));
  await deleteConnectorProvider(id);
  revalidatePath("/admin/connector-providers");
}

const secretSchema = z.object({
  value: z.string().trim().min(1, "A value is required.").max(2000),
});

/**
 * Generic set/delete for any single-value `platform_secrets` entry —
 * `PlatformSecretForm` binds `key` client-side (`action.bind(null, key)`)
 * so each secret on the page (the GitHub webhook secret, the cron
 * scheduler's bearer secret, and any future one) reuses the same pair of
 * actions instead of getting its own.
 */
export async function setPlatformSecretFieldAction(
  key: string,
  _previous: ConnectorProviderFormState,
  formData: FormData,
): Promise<ConnectorProviderFormState> {
  const session = await requirePlatformAdmin();
  requireSuperadmin(session);
  const parsed = secretSchema.safeParse({ value: formData.get("value") });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Check the value.",
    };
  }
  await setPlatformSecret({
    key,
    value: parsed.data.value,
    updatedByWorkosUserId: session.user.id,
  });
  revalidatePath("/admin/connector-providers");
  return { status: "success", message: "Saved." };
}

export async function deletePlatformSecretFieldAction(key: string) {
  const session = await requirePlatformAdmin();
  requireSuperadmin(session);
  await deletePlatformSecret(key);
  revalidatePath("/admin/connector-providers");
}
