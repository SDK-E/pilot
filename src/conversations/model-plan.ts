import "server-only";

const FALLBACK_MODEL_ID = "kilo/kilo-auto/free";

interface ModelPlanPolicy {
  primaryModelId: string;
  retryEnabled: boolean;
}

export interface ModelPlanInput {
  policy: ModelPlanPolicy;
  requestedModelId?: string;
  /**
   * A `byok:` selector to substitute for the org's `primaryModelId` when
   * there is no explicit per-message pick — set only once the caller has
   * confirmed (via `resolveUsageFallbackModelId`) that this user's platform
   * usage allowance is exhausted and they have an enabled BYOK credential.
   * Never applied over an explicit pick, which already won its own branch.
   */
  usageFallbackModelId?: string;
}

/**
 * Orders the model selector strings a turn should attempt, in priority
 * order. An explicit per-message pick always wins — a BYOK pick never
 * silently falls back to the platform default, since choosing your own key
 * is exactly the point; a platform-model pick still gets the org's usual
 * retry fallback. No override checks `usageFallbackModelId`: once the
 * user's platform allowance is exhausted, their own BYOK key substitutes
 * for the org's `primaryModelId` (still no silent platform fallback behind
 * it — it's already their own key). Otherwise falls back to today's
 * default: the org's `primaryModelId`, plus the fixed fallback when retry
 * is enabled.
 */
export function resolveModelPlan(input: ModelPlanInput): string[] {
  if (input.requestedModelId?.startsWith("byok:")) {
    return [input.requestedModelId];
  }
  if (input.requestedModelId) {
    return input.policy.retryEnabled
      ? [input.requestedModelId, FALLBACK_MODEL_ID]
      : [input.requestedModelId];
  }
  if (input.usageFallbackModelId) {
    return [input.usageFallbackModelId];
  }
  return input.policy.retryEnabled
    ? [input.policy.primaryModelId, FALLBACK_MODEL_ID]
    : [input.policy.primaryModelId];
}
