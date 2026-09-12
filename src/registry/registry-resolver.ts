import type { ApprovedSnapshot } from "./registry-types";
import type { ActorContext } from "@/policy/actor-context";

export type ResolveModelInput = {
  organizationId: string;
  actorContext: ActorContext;
  requestedModelId?: string;
  locale?: string;
};

export type ResolveResult =
  | { ok: true; snapshot: ApprovedSnapshot; reason: "approved" }
  | {
      ok: false;
      reasonCode:
        | "unknown_model"
        | "region_blocked"
        | "tool_not_allowed"
        | "no_active_membership"
        | "no_model_configured";
    };

export function resolveModel(input: ResolveModelInput): ResolveResult {
  if (!input.actorContext.membership) {
    return { ok: false, reasonCode: "no_active_membership" };
  }

  if (!input.requestedModelId) {
    return { ok: false, reasonCode: "no_model_configured" };
  }

  const model = input.requestedModelId;

  if (model !== "kilo/kilo-auto/free") {
    return { ok: false, reasonCode: "unknown_model" };
  }

  const snapshot: ApprovedSnapshot = {
    id: `snap_${input.organizationId}_${model}`,
    organizationId: input.organizationId,
    actorId: input.actorContext.workosUserId,
    modelId: model,
    providerId: "prov_default",
    modelVersion: 1,
    contextWindow: 24_000,
    toolIds: ["web-search", "scratchpad", "ask-user"],
    locale: input.locale ?? null,
    region: null,
    version: 1,
    approvedAt: new Date(),
    expiresAt: null,
  };

  return { ok: true, snapshot, reason: "approved" };
}
