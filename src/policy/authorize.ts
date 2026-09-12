import "server-only";

import type { ActorContext, ActorScope } from "./actor-context";

export type AuthorizationDecision = {
  decision: "allow" | "deny" | "requires_approval";
  reasonCode: string;
};

type Resource = {
  type: string;
  id?: string;
  organizationId: string;
  createdByWorkosUserId?: string;
  decidedByWorkosUserId?: string;
};

export function authorize(input: {
  actor: ActorContext;
  action: string;
  resource: Resource;
}): AuthorizationDecision {
  const { actor, action, resource } = input;

  if (actor.membership === null || actor.membership === undefined) {
    return { decision: "deny", reasonCode: "no_active_membership" };
  }

  if (resource.organizationId !== actor.organizationId) {
    return { decision: "deny", reasonCode: "foreign_resource" };
  }

  const [actionDomain, actionVerb] = action.split(":") as [string, string];

  switch (action) {
    case "read:conversation":
      return authorizeReadConversation(actor, resource);
    case "write:conversation":
      return authorizeWriteConversation(actor, resource);
    case "read:project":
      return authorizeReadProject(actor, resource);
    case "write:project":
      return authorizeWriteProject(actor, resource);
    case "read:approval":
      return authorizeReadApproval(actor, resource);
    case "decide:approval":
      return authorizeDecideApproval(actor, resource);
    case "execute:tool":
      return authorizeExecuteTool(actor, resource);
    case "execution:run":
      return authorizeExecutionRun(actor, resource);
    default:
      if (actionVerb === "read") {
        return { decision: "deny", reasonCode: "unknown_action" };
      }
      return { decision: "deny", reasonCode: "unknown_action" };
  }
}

function authorizeReadConversation(
  actor: ActorContext,
  resource: Resource,
): AuthorizationDecision {
  if (!actor.scope.includes("conversation:read")) {
    return { decision: "deny", reasonCode: "scope_missing" };
  }
  if (
    resource.createdByWorkosUserId &&
    resource.createdByWorkosUserId !== actor.workosUserId
  ) {
    return { decision: "deny", reasonCode: "not_resource_owner" };
  }
  return { decision: "allow", reasonCode: "resource_owner" };
}

function authorizeWriteConversation(
  actor: ActorContext,
  resource: Resource,
): AuthorizationDecision {
  if (!actor.scope.includes("conversation:write")) {
    return { decision: "deny", reasonCode: "scope_missing" };
  }
  if (
    resource.createdByWorkosUserId &&
    resource.createdByWorkosUserId !== actor.workosUserId
  ) {
    return { decision: "deny", reasonCode: "not_resource_owner" };
  }
  return { decision: "allow", reasonCode: "resource_owner" };
}

function authorizeReadProject(
  actor: ActorContext,
  resource: Resource,
): AuthorizationDecision {
  if (!actor.scope.includes("project:read")) {
    return { decision: "deny", reasonCode: "scope_missing" };
  }
  return { decision: "allow", reasonCode: "organization_member" };
}

function authorizeWriteProject(
  actor: ActorContext,
  resource: Resource,
): AuthorizationDecision {
  if (!actor.scope.includes("project:write")) {
    return { decision: "deny", reasonCode: "scope_missing" };
  }
  return { decision: "allow", reasonCode: "organization_member" };
}

function authorizeReadApproval(
  actor: ActorContext,
  resource: Resource,
): AuthorizationDecision {
  if (!actor.scope.includes("approval:read")) {
    return { decision: "deny", reasonCode: "scope_missing" };
  }
  return { decision: "allow", reasonCode: "organization_member" };
}

function authorizeDecideApproval(
  actor: ActorContext,
  resource: Resource,
): AuthorizationDecision {
  if (!actor.scope.includes("approval:decide")) {
    return { decision: "deny", reasonCode: "scope_missing" };
  }
  if (
    resource.decidedByWorkosUserId &&
    resource.decidedByWorkosUserId === actor.workosUserId
  ) {
    return { decision: "deny", reasonCode: "already_decided" };
  }
  return { decision: "allow", reasonCode: "membership_owner_or_admin" };
}

function authorizeExecutionRun(
  actor: ActorContext,
  resource: Resource,
): AuthorizationDecision {
  if (!actor.scope.includes("execution:run")) {
    return { decision: "deny", reasonCode: "scope_missing" };
  }
  if (resource.organizationId !== actor.organizationId) {
    return { decision: "deny", reasonCode: "foreign_resource" };
  }
  return { decision: "allow", reasonCode: "organization_member" };
}

function authorizeExecuteTool(
  actor: ActorContext,
  resource: Resource,
): AuthorizationDecision {
  const toolId = resource.id ?? "";
  const productionToolIds = ["web-search", "scratchpad", "ask-user"];
  if (!productionToolIds.includes(toolId)) {
    return { decision: "deny", reasonCode: "tool_not_allowed" };
  }
  return {
    decision: "requires_approval",
    reasonCode: "tool_requires_approval",
  };
}
