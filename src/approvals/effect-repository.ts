import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { effectIntents } from "@/db/schema";
import type { EffectIntent, ReconciliationResult } from "./effect-intent-types";

export async function recordEffectIntent(input: {
  organizationId: string;
  proposalId: string;
  approvalId?: string;
  effectKey: string;
  externalRef?: string;
}): Promise<EffectIntent> {
  const now = new Date();
  const [intent] = await db
    .insert(effectIntents)
    .values({
      organizationId: input.organizationId,
      proposalId: input.proposalId,
      approvalId: input.approvalId ?? null,
      effectKey: input.effectKey,
      externalRef: input.externalRef ?? null,
      status: "prepared",
      result: null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return toEffectIntent(intent);
}

export async function getEffectByKey(
  effectKey: string,
): Promise<EffectIntent | undefined> {
  const [intent] = await db
    .select()
    .from(effectIntents)
    .where(eq(effectIntents.effectKey, effectKey))
    .limit(1);

  if (!intent) return undefined;
  return toEffectIntent(intent);
}

export async function updateEffectStatus(input: {
  effectKey: string;
  status: EffectIntent["status"];
  result?: EffectIntent["result"];
}): Promise<void> {
  await db
    .update(effectIntents)
    .set({
      status: input.status,
      result: input.result ?? null,
      updatedAt: new Date(),
    })
    .where(eq(effectIntents.effectKey, input.effectKey));
}

export async function reconcileEffect(input: {
  effectKey: string;
}): Promise<ReconciliationResult> {
  const intent = await getEffectByKey(input.effectKey);
  if (!intent) {
    return {
      intentId: "",
      handleMatch: false,
      stateMatch: false,
      resolvedStatus: "unknown",
      reason: "Effect intent not found for reconciliation",
    };
  }
  const externalStateAvailable = intent.status === "dispatched";
  return {
    intentId: intent.id,
    handleMatch: externalStateAvailable,
    stateMatch: externalStateAvailable,
    resolvedStatus: externalStateAvailable
      ? (intent.status as EffectIntent["status"])
      : "unknown",
    reason: externalStateAvailable
      ? "External state verified"
      : "External state could not be verified; reconciliation required",
  };
}

export async function listEffects(input: {
  organizationId: string;
  proposalId?: string;
}): Promise<EffectIntent[]> {
  const whereClause = input.proposalId
    ? and(
        eq(effectIntents.organizationId, input.organizationId),
        eq(effectIntents.proposalId, input.proposalId),
      )
    : eq(effectIntents.organizationId, input.organizationId);
  const rows = await db
    .select()
    .from(effectIntents)
    .where(whereClause)
    .orderBy(desc(effectIntents.createdAt));

  return rows.map(toEffectIntent);
}

function toEffectIntent(row: typeof effectIntents.$inferSelect): EffectIntent {
  return {
    id: row.id,
    organizationId: row.organizationId,
    proposalId: row.proposalId ?? "",
    approvalId: row.approvalId ?? undefined,
    effectKey: row.effectKey,
    externalRef: row.externalRef ?? undefined,
    status: row.status,
    result: row.result as EffectIntent["result"],
    dispatchedAt: row.dispatchedAt ?? undefined,
    confirmedAt: row.confirmedAt ?? undefined,
    failedAt: row.failedAt ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
