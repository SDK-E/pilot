"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { optionalText } from "@/lib/form-data";
import {
  deleteConnectorProviderCredential,
  upsertConnectorProviderCredential,
} from "@/platform/connector-provider-credential-repository";
import {
  deletePlatformSecret,
  GITHUB_MARKETPLACE_WEBHOOK_SECRET_KEY,
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

const credentialSchema = z.object({
  slug: z.string().trim().min(1).max(100),
  clientId: z.string().trim().min(1, "A client id is required.").max(500),
  clientSecret: z.string().trim().max(2000).optional(),
});

export async function setConnectorProviderCredentialAction(
  _previous: ConnectorProviderFormState,
  formData: FormData,
): Promise<ConnectorProviderFormState> {
  const session = await requirePlatformAdmin();
  requireSuperadmin(session);
  const parsed = credentialSchema.safeParse({
    slug: formData.get("slug"),
    clientId: formData.get("clientId"),
    clientSecret: optionalText(formData, "clientSecret"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Check the fields.",
    };
  }
  await upsertConnectorProviderCredential({
    slug: parsed.data.slug,
    clientId: parsed.data.clientId,
    clientSecret: parsed.data.clientSecret ?? null,
    updatedByWorkosUserId: session.user.id,
  });
  revalidatePath("/admin/connector-providers");
  return { status: "success", message: "Saved." };
}

export async function deleteConnectorProviderCredentialAction(
  formData: FormData,
) {
  const session = await requirePlatformAdmin();
  requireSuperadmin(session);
  const slug = z.string().trim().min(1).parse(formData.get("slug"));
  await deleteConnectorProviderCredential(slug);
  revalidatePath("/admin/connector-providers");
}

const secretSchema = z.object({
  value: z.string().trim().min(1, "A value is required.").max(2000),
});

export async function setGithubMarketplaceWebhookSecretAction(
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
    key: GITHUB_MARKETPLACE_WEBHOOK_SECRET_KEY,
    value: parsed.data.value,
    updatedByWorkosUserId: session.user.id,
  });
  revalidatePath("/admin/connector-providers");
  return { status: "success", message: "Saved." };
}

export async function deleteGithubMarketplaceWebhookSecretAction() {
  const session = await requirePlatformAdmin();
  requireSuperadmin(session);
  await deletePlatformSecret(GITHUB_MARKETPLACE_WEBHOOK_SECRET_KEY);
  revalidatePath("/admin/connector-providers");
}
