"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  createConnectorDefinition,
  deleteConnectorDefinition,
  disconnectConnectorDefinition,
  setConnectorDefinitionStatus,
  updateConnectorDefinition,
} from "@/connectors/connector-definition-repository";
import { seedDefaultConnectorDefinitions } from "@/connectors/connector-seed";
import { requireWorkspaceSession } from "@/organizations/workspace-session";

const ADMIN_ROLES = new Set(["owner", "admin"]);

async function requireAdmin() {
  const session = await requireWorkspaceSession();
  if (!ADMIN_ROLES.has(session.membership.role.slug)) {
    throw new Error(
      "Only organization owners and admins can manage custom connectors.",
    );
  }
  return session;
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

const definitionFieldsSchema = z.object({
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
type DefinitionFields = z.infer<typeof definitionFieldsSchema>;

function parseDefinitionFields(formData: FormData): DefinitionFields {
  return definitionFieldsSchema.parse({
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
 * Creates an admin-defined connector: a generic OAuth2 + REST integration
 * configured from Settings instead of shipped as a built-in TypeScript
 * provider. Org-wide only — see docs/decisions/0023-dynamic-connectors.md.
 */
export async function createCustomConnectorAction(formData: FormData) {
  const session = await requireAdmin();
  const slugInput = z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers, and hyphens only.")
    .parse(formData.get("slug"));
  const fields = parseDefinitionFields(formData);
  const clientSecret = z
    .string()
    .trim()
    .min(1, "A client secret is required.")
    .max(2000)
    .parse(formData.get("clientSecret"));

  await createConnectorDefinition({
    organizationId: session.organizationId,
    slug: slugInput,
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
    createdByWorkosUserId: session.user.id,
  });
  revalidatePath("/settings");
}

export async function updateCustomConnectorAction(formData: FormData) {
  const session = await requireAdmin();
  const id = z.uuid().parse(formData.get("id"));
  const fields = parseDefinitionFields(formData);
  const clientSecret = formValue(formData, "clientSecret") ?? null;

  await updateConnectorDefinition({
    organizationId: session.organizationId,
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
  });
  revalidatePath("/settings");
}

export async function setCustomConnectorEnabledAction(formData: FormData) {
  const session = await requireAdmin();
  const id = z.uuid().parse(formData.get("id"));
  const isEnabled = formData.get("enabled") === "true";
  await setConnectorDefinitionStatus({
    organizationId: session.organizationId,
    id,
    definitionStatus: isEnabled ? "active" : "disabled",
  });
  revalidatePath("/settings");
}

export async function disconnectCustomConnectorAction(formData: FormData) {
  const session = await requireAdmin();
  const id = z.uuid().parse(formData.get("id"));
  await disconnectConnectorDefinition({
    organizationId: session.organizationId,
    id,
  });
  revalidatePath("/settings");
}

export async function deleteCustomConnectorAction(formData: FormData) {
  const session = await requireAdmin();
  const id = z.uuid().parse(formData.get("id"));
  await deleteConnectorDefinition({
    organizationId: session.organizationId,
    id,
  });
  revalidatePath("/settings");
}

/**
 * Adds Pilot's built-in connectors (GitHub, Slack, ...) as ordinary,
 * admin-editable rows — a one-time population an admin explicitly triggers,
 * never an automatic side effect of loading Settings. A no-op once the org
 * already has any connector defined.
 */
export async function seedDefaultConnectorsAction() {
  const session = await requireAdmin();
  await seedDefaultConnectorDefinitions({
    organizationId: session.organizationId,
    createdByWorkosUserId: session.user.id,
  });
  revalidatePath("/settings");
}
