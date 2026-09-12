import "server-only";

export type PolicyClass =
  | "read"
  | "local_reversible"
  | "external_write"
  | "destructive"
  | "financial"
  | "deployment";

export type PolicyRiskLevel = "low" | "medium" | "high" | "critical";

export interface PolicyClassDefinition {
  class: PolicyClass;
  label: string;
  riskLevel: PolicyRiskLevel;
  requiresExplicitGrant: boolean;
  canAutoApprove: boolean;
  sideEffectScope: "none" | "local" | "external" | "cross_system";
  grantSufficient: boolean;
}

export interface PolicyCheck {
  decision: "allow" | "deny" | "requires_approval";
  reasonCode: string;
  class: PolicyClass;
  requiresApproval: boolean;
  requiresGrant: boolean;
}

export const POLICY_CLASSES: Record<PolicyClass, PolicyClassDefinition> = {
  read: {
    class: "read",
    label: "read",
    riskLevel: "low",
    requiresExplicitGrant: false,
    canAutoApprove: true,
    sideEffectScope: "none",
    grantSufficient: true,
  },
  local_reversible: {
    class: "local_reversible",
    label: "local_reversible",
    riskLevel: "medium",
    requiresExplicitGrant: false,
    canAutoApprove: false,
    sideEffectScope: "local",
    grantSufficient: true,
  },
  external_write: {
    class: "external_write",
    label: "external_write",
    riskLevel: "high",
    requiresExplicitGrant: true,
    canAutoApprove: false,
    sideEffectScope: "external",
    grantSufficient: true,
  },
  destructive: {
    class: "destructive",
    label: "destructive",
    riskLevel: "critical",
    requiresExplicitGrant: true,
    canAutoApprove: false,
    sideEffectScope: "external",
    grantSufficient: false,
  },
  financial: {
    class: "financial",
    label: "financial",
    riskLevel: "critical",
    requiresExplicitGrant: true,
    canAutoApprove: false,
    sideEffectScope: "cross_system",
    grantSufficient: false,
  },
  deployment: {
    class: "deployment",
    label: "deployment",
    riskLevel: "high",
    requiresExplicitGrant: true,
    canAutoApprove: false,
    sideEffectScope: "cross_system",
    grantSufficient: false,
  },
};

export function classifyAction(
  _targetRef: string,
  actionType: string,
): PolicyClass {
  if (actionType.startsWith("read:")) return "read";
  if (actionType.startsWith("write:") || actionType === "publish_pr") {
    return "external_write";
  }
  if (actionType.startsWith("delete:")) return "destructive";
  if (actionType.startsWith("financial:") || actionType === "financial") {
    return "financial";
  }
  if (actionType.startsWith("deploy:")) return "deployment";
  return "external_write";
}

export function isAutoClassifierSignal(actionType: string): boolean {
  return actionType === "auto-classifier";
}

export function checkPolicyClass(
  actorScopes: string[],
  actionType: string,
  hasGrant: boolean,
): PolicyCheck {
  const policyClass = classifyAction("", actionType);
  const definition = POLICY_CLASSES[policyClass];

  if (isAutoClassifierSignal(actionType)) {
    return {
      decision: "requires_approval",
      reasonCode: "auto_classifier_is_signal_only",
      class: policyClass,
      requiresApproval: true,
      requiresGrant: false,
    };
  }

  if (definition.canAutoApprove && actorScopes.includes("approval:decide")) {
    return {
      decision: "allow",
      reasonCode: "policy_auto_approve",
      class: policyClass,
      requiresApproval: false,
      requiresGrant: false,
    };
  }

  if (
    definition.requiresExplicitGrant &&
    hasGrant &&
    definition.grantSufficient
  ) {
    return {
      decision: "allow",
      reasonCode: "explicit_grant",
      class: policyClass,
      requiresApproval: false,
      requiresGrant: false,
    };
  }

  if (hasGrant && definition.sideEffectScope === "none") {
    return {
      decision: "allow",
      reasonCode: "explicit_grant",
      class: policyClass,
      requiresApproval: false,
      requiresGrant: false,
    };
  }

  if (definition.requiresExplicitGrant) {
    return {
      decision: "requires_approval",
      reasonCode: `${policyClass}_requires_explicit_grant`,
      class: policyClass,
      requiresApproval: true,
      requiresGrant: true,
    };
  }

  return {
    decision: "requires_approval",
    reasonCode: `${policyClass}_requires_approval`,
    class: policyClass,
    requiresApproval: true,
    requiresGrant: false,
  };
}
