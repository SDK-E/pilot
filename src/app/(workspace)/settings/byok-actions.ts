"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  createByokCredential,
  deleteByokCredential,
  getByokCredential,
  updateByokCredential,
} from "@/byok/byok-repository";
import { requireWorkspaceSession } from "@/organizations/workspace-session";

/**
 * A blank text field means "not provided," same as it being absent.
 */
function formValue(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value : undefined;
}

const configurationSchema = z.object({
  label: z.string().trim().min(1).max(200),
  providerId: z.string().trim().min(1).max(100),
  baseUrl: z.url().max(500),
  allowedModelIds: z.array(z.string().trim().min(1)).max(50),
  enabled: z.boolean(),
});

function formConfiguration(formData: FormData) {
  return configurationSchema.parse({
    label: formValue(formData, "label"),
    providerId: formValue(formData, "providerId"),
    baseUrl: formValue(formData, "baseUrl"),
    allowedModelIds: formData.getAll("allowedModelIds"),
    enabled: formData.get("enabled") === "true",
  });
}

/**
 * Only the credential's own owner may act on it — this is personal-scope
 * data, not org-admin data, unlike `model_gateways`.
 */
async function requireOwnedCredential(credentialId: string) {
  const session = await requireWorkspaceSession();
  const credential = await getByokCredential(credentialId);
  if (
    credential?.organizationId !== session.organizationId ||
    credential.createdByWorkosUserId !== session.user.id
  ) {
    throw new Error("This key is not yours to manage.");
  }
  return session;
}

export async function createByokCredentialAction(formData: FormData) {
  const session = await requireWorkspaceSession();
  const configuration = formConfiguration(formData);
  const apiKey = formValue(formData, "apiKey");
  if (!apiKey) throw new Error("An API key is required.");
  await createByokCredential(session.organizationId, session.user.id, {
    ...configuration,
    apiKey,
  });
  revalidatePath("/settings");
}

export async function updateByokCredentialAction(
  credentialId: string,
  formData: FormData,
) {
  await requireOwnedCredential(credentialId);
  const configuration = formConfiguration(formData);
  await updateByokCredential(credentialId, {
    ...configuration,
    apiKey: formValue(formData, "apiKey"),
  });
  revalidatePath("/settings");
}

export async function setByokCredentialEnabledAction(
  credentialId: string,
  isEnabled: boolean,
) {
  await requireOwnedCredential(credentialId);
  const credential = await getByokCredential(credentialId);
  if (!credential) return;
  await updateByokCredential(credentialId, {
    label: credential.label,
    providerId: credential.providerId,
    baseUrl: credential.baseUrl,
    allowedModelIds: credential.allowedModelIds,
    enabled: isEnabled,
  });
  revalidatePath("/settings");
}

export async function deleteByokCredentialAction(credentialId: string) {
  await requireOwnedCredential(credentialId);
  await deleteByokCredential(credentialId);
  revalidatePath("/settings");
}
