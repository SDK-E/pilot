import "server-only";

import { eq } from "drizzle-orm";

import { decryptToken, encryptToken } from "@/connectors/token-encryption";
import { db } from "@/db/client";
import { platformSecrets } from "@/db/schema";

export const GITHUB_MARKETPLACE_WEBHOOK_SECRET_KEY =
  "github_marketplace_webhook_secret";

/**
 * Authenticates `/api/cron/*` routes (`Authorization: Bearer <value>`,
 * checked by `isVerifiedCronRequest`, `src/lib/cron-auth.ts`) against the
 * external HTTP scheduler's (cron-job.org) saved header. Admin-managed like
 * every other entry here so rotating it needs no deploy.
 */
export const CRON_SECRET_KEY = "cron_secret";

/**
 * Existence only, no decryption — for an admin UI's "configured" badge.
 */
export async function hasPlatformSecret(key: string): Promise<boolean> {
  const [row] = await db
    .select({ key: platformSecrets.key })
    .from(platformSecrets)
    .where(eq(platformSecrets.key, key))
    .limit(1);
  return Boolean(row);
}

export async function getPlatformSecret(key: string): Promise<string | null> {
  const [row] = await db
    .select()
    .from(platformSecrets)
    .where(eq(platformSecrets.key, key))
    .limit(1);
  if (!row) return null;
  return decryptToken({
    ciphertext: row.valueCiphertext,
    iv: row.valueIv,
    authTag: row.valueAuthTag,
  });
}

export async function setPlatformSecret(input: {
  key: string;
  value: string;
  updatedByWorkosUserId: string;
}): Promise<void> {
  const encrypted = encryptToken(input.value);
  await db
    .insert(platformSecrets)
    .values({
      key: input.key,
      valueCiphertext: encrypted.ciphertext,
      valueIv: encrypted.iv,
      valueAuthTag: encrypted.authTag,
      updatedByWorkosUserId: input.updatedByWorkosUserId,
    })
    .onConflictDoUpdate({
      target: platformSecrets.key,
      set: {
        valueCiphertext: encrypted.ciphertext,
        valueIv: encrypted.iv,
        valueAuthTag: encrypted.authTag,
        updatedByWorkosUserId: input.updatedByWorkosUserId,
        updatedAt: new Date(),
      },
    });
}

export async function deletePlatformSecret(key: string): Promise<void> {
  await db.delete(platformSecrets).where(eq(platformSecrets.key, key));
}
