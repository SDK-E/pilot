import "server-only";

const FALLBACK_MODEL_ID = "kilo/kilo-auto/free";

export interface ModelPlanPolicy {
  primaryModelId: string;
  retryEnabled: boolean;
}

export interface ModelPlanInput {
  policy: ModelPlanPolicy;
  requestedModelId?: string;
}

/**
 * Orders the model selector strings a turn should attempt, in priority
 * order. An explicit per-message pick always wins — a BYOK pick never
 * silently falls back to the platform default, since choosing your own key
 * is exactly the point; a platform-model pick still gets the org's usual
 * retry fallback. No override falls back to today's default: the org's
 * `primaryModelId`, plus the fixed fallback when retry is enabled.
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
  return input.policy.retryEnabled
    ? [input.policy.primaryModelId, FALLBACK_MODEL_ID]
    : [input.policy.primaryModelId];
}
