import "server-only";

export type ActionProposalType =
  | "publish_pr"
  | "send_message"
  | "deploy"
  | "external_write"
  | "delete"
  | "financial";

export type ActionProposalVersion = string;

export type ActionProposalStatus = "pending" | "stale" | "consumed";

export type ActionProposalRisk = "low" | "medium" | "high" | "critical";

export interface ActionProposal {
  id: string;
  organizationId: string;
  proposalId: string;
  proposalHash: string;
  type: ActionProposalType;
  version: ActionProposalVersion;
  targetRef: string;
  artifactRevision?: string;
  canonicalArgsHash: string;
  permissionSnapshot: Record<string, unknown>;
  expiresAt: Date;
  riskSummary: string;
  status: ActionProposalStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ActionProposalHandle {
  proposalId: string;
  proposalHash: string;
}

export function createActionProposal(input: {
  organizationId: string;
  proposalId: string;
  type: ActionProposalType;
  version: ActionProposalVersion;
  targetRef: string;
  artifactRevision?: string;
  canonicalArgsHash: string;
  permissionSnapshot: Record<string, unknown>;
  expiresAt: Date;
  riskSummary: string;
  id?: string;
  status?: ActionProposalStatus;
  createdAt?: Date;
  updatedAt?: Date;
}): ActionProposal {
  return {
    id: input.id ?? crypto.randomUUID(),
    organizationId: input.organizationId,
    proposalId: input.proposalId,
    proposalHash: computeProposalHash(input),
    type: input.type,
    version: input.version,
    targetRef: input.targetRef,
    artifactRevision: input.artifactRevision,
    canonicalArgsHash: input.canonicalArgsHash,
    permissionSnapshot: input.permissionSnapshot,
    expiresAt: input.expiresAt,
    riskSummary: input.riskSummary,
    status: input.status ?? "pending",
    createdAt: input.createdAt ?? new Date(),
    updatedAt: input.updatedAt ?? new Date(),
  };
}

export function isProposalExpired(proposal: ActionProposal): boolean {
  return proposal.expiresAt.getTime() <= Date.now();
}

export function isProposalActive(proposal: ActionProposal): boolean {
  return proposal.status === "pending" && !isProposalExpired(proposal);
}

export function invalidateProposal(proposal: ActionProposal): ActionProposal {
  if (proposal.status === "consumed") {
    throw new Error("Cannot invalidate a consumed proposal.");
  }
  if (proposal.status === "stale") {
    return proposal;
  }
  return {
    ...proposal,
    status: "stale",
    updatedAt: new Date(),
  };
}

export function consumeProposal(proposal: ActionProposal): ActionProposal {
  if (proposal.status === "consumed") {
    throw new Error("Cannot consume an already consumed proposal.");
  }
  if (proposal.status === "stale") {
    throw new Error("Cannot consume a stale proposal.");
  }
  return {
    ...proposal,
    status: "consumed",
    updatedAt: new Date(),
  };
}

function computeProposalHash(input: {
  type: ActionProposalType;
  targetRef: string;
  canonicalArgsHash: string;
  permissionSnapshot: Record<string, unknown>;
  version: string;
}): string {
  const payload = JSON.stringify({
    t: input.type,
    r: input.targetRef,
    h: input.canonicalArgsHash,
    p: input.permissionSnapshot,
    v: input.version,
  });
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    const char = payload.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `ph_${Math.abs(hash).toString(16).padStart(8, "0")}`;
}
