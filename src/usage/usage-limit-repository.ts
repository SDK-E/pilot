import "server-only";

import { and, eq, gte, sql } from "drizzle-orm";

import { listSelectableByokModels } from "@/byok/byok-repository";
import { db } from "@/db/client";
import { usageEvents, usageLimitPolicies } from "@/db/schema";

const FIVE_HOURS_MS = 5 * 60 * 60 * 1000;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export interface UsageLimitPolicy {
  fiveHourTokenLimit: number | null;
  weeklyTokenLimit: number | null;
}

const unlimited: UsageLimitPolicy = {
  fiveHourTokenLimit: null,
  weeklyTokenLimit: null,
};

export async function getUsageLimitPolicy(
  organizationId: string,
): Promise<UsageLimitPolicy> {
  const [policy] = await db
    .select({
      fiveHourTokenLimit: usageLimitPolicies.fiveHourTokenLimit,
      weeklyTokenLimit: usageLimitPolicies.weeklyTokenLimit,
    })
    .from(usageLimitPolicies)
    .where(eq(usageLimitPolicies.organizationId, organizationId))
    .limit(1);
  return policy ?? unlimited;
}

export async function updateUsageLimitPolicy(input: {
  organizationId: string;
  updatedByWorkosUserId: string;
  fiveHourTokenLimit: number | null;
  weeklyTokenLimit: number | null;
}) {
  const [policy] = await db
    .insert(usageLimitPolicies)
    .values(input)
    .onConflictDoUpdate({
      target: usageLimitPolicies.organizationId,
      set: {
        fiveHourTokenLimit: input.fiveHourTokenLimit,
        weeklyTokenLimit: input.weeklyTokenLimit,
        updatedByWorkosUserId: input.updatedByWorkosUserId,
        updatedAt: new Date(),
      },
    })
    .returning({
      fiveHourTokenLimit: usageLimitPolicies.fiveHourTokenLimit,
      weeklyTokenLimit: usageLimitPolicies.weeklyTokenLimit,
    });
  return policy;
}

async function sumTokensSince(userId: string, since: Date): Promise<number> {
  const [row] = await db
    .select({
      total: sql<string>`coalesce(sum(${usageEvents.inputTokens} + ${usageEvents.outputTokens}), 0)`,
    })
    .from(usageEvents)
    .where(
      and(
        eq(usageEvents.userId, userId),
        eq(usageEvents.source, "platform"),
        gte(usageEvents.createdAt, since),
      ),
    );
  return Number(row?.total ?? 0);
}

export interface UsageWindowState {
  fiveHourTokens: number;
  weeklyTokens: number;
  fiveHourExceeded: boolean;
  weeklyExceeded: boolean;
}

/**
 * Reads both rolling windows for one user and reports whether either has
 * exceeded the org's policy. A `null` limit on either window is treated as
 * unlimited — never exceeded.
 */
export async function getUsageWindowState(
  organizationId: string,
  userId: string,
): Promise<UsageWindowState> {
  const now = Date.now();
  const [policy, fiveHourTokens, weeklyTokens] = await Promise.all([
    getUsageLimitPolicy(organizationId),
    sumTokensSince(userId, new Date(now - FIVE_HOURS_MS)),
    sumTokensSince(userId, new Date(now - WEEK_MS)),
  ]);
  return {
    fiveHourTokens,
    weeklyTokens,
    fiveHourExceeded:
      policy.fiveHourTokenLimit !== null &&
      fiveHourTokens >= policy.fiveHourTokenLimit,
    weeklyExceeded:
      policy.weeklyTokenLimit !== null &&
      weeklyTokens >= policy.weeklyTokenLimit,
  };
}

/**
 * Once a user's 5-hour or weekly platform allowance is exhausted, their own
 * BYOK credential (if they have an enabled one) substitutes for the org's
 * `primaryModelId` — see `model-plan.ts`. Picks the first enabled
 * credential's first allowed model id; a user with several credentials
 * chooses which one backs their explicit picks from the composer, so this
 * fallback path only needs *a* usable one, not a preferred one.
 */
export async function resolveUsageFallbackModelId(
  organizationId: string,
  userId: string,
): Promise<string | undefined> {
  const state = await getUsageWindowState(organizationId, userId);
  if (!state.fiveHourExceeded && !state.weeklyExceeded) return undefined;
  const [firstModel] = await listSelectableByokModels(organizationId, userId);
  return firstModel?.value;
}

export async function recordUsageEvent(input: {
  organizationId: string;
  userId: string;
  executionId: string;
  modelId: string;
  source: "platform" | "byok";
  inputTokens: number;
  outputTokens: number;
}) {
  await db.insert(usageEvents).values(input);
}
