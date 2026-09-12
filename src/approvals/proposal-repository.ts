import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { actionProposals } from "@/db/schema";
import type { ActionProposal } from "./action-proposal-types";

export async function createProposal(input: {
  organizationId: string;
  type: ActionProposal["type"];
  version: string;
  targetRef: string;
  artifactRevision?: string;
  canonicalArgsHash: string;
  permissionSnapshot: Record<string, unknown>;
  expiresAt: Date;
  riskSummary: string;
}): Promise<ActionProposal> {
  const now = new Date();
  const id = crypto.randomUUID();
  const proposalId = `prop_${id.slice(0, 8)}`;
  const proposalHash = computeProposalHashFor(input);

  const [proposal] = await db
    .insert(actionProposals)
    .values({
      id,
      organizationId: input.organizationId,
      proposalId,
      proposalHash,
      type: input.type,
      version: input.version,
      targetRef: input.targetRef,
      artifactRevision: input.artifactRevision ?? null,
      canonicalArgsHash: input.canonicalArgsHash,
      permissionSnapshot: input.permissionSnapshot,
      expiresAt: input.expiresAt,
      riskSummary: input.riskSummary,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return toActionProposal(proposal);
}

export async function getProposal(input: {
  organizationId: string;
  proposalId: string;
}): Promise<ActionProposal | undefined> {
  const [proposal] = await db
    .select()
    .from(actionProposals)
    .where(
      and(
        eq(actionProposals.organizationId, input.organizationId),
        eq(actionProposals.proposalId, input.proposalId),
      ),
    )
    .limit(1);

  if (!proposal) return undefined;
  return toActionProposal(proposal);
}

export async function markStale(input: {
  organizationId: string;
  proposalId: string;
}): Promise<void> {
  await db
    .update(actionProposals)
    .set({ status: "stale", updatedAt: new Date() })
    .where(
      and(
        eq(actionProposals.organizationId, input.organizationId),
        eq(actionProposals.proposalId, input.proposalId),
        eq(actionProposals.status, "pending"),
      ),
    );
}

export async function consumeProposalById(input: {
  organizationId: string;
  proposalId: string;
}): Promise<void> {
  await db
    .update(actionProposals)
    .set({ status: "consumed", updatedAt: new Date() })
    .where(
      and(
        eq(actionProposals.organizationId, input.organizationId),
        eq(actionProposals.proposalId, input.proposalId),
        eq(actionProposals.status, "pending"),
      ),
    );
}

export async function listProposals(input: {
  organizationId: string;
  status?: ActionProposal["status"];
}): Promise<ActionProposal[]> {
  const whereClause = input.status
    ? and(
        eq(actionProposals.organizationId, input.organizationId),
        eq(actionProposals.status, input.status),
      )
    : eq(actionProposals.organizationId, input.organizationId);
  const rows = await db
    .select()
    .from(actionProposals)
    .where(whereClause)
    .orderBy(desc(actionProposals.createdAt));

  return rows.map(toActionProposal);
}

function toActionProposal(
  row: typeof actionProposals.$inferSelect,
): ActionProposal {
  return {
    id: row.id,
    organizationId: row.organizationId,
    proposalId: row.proposalId,
    proposalHash: row.proposalHash,
    type: row.type as ActionProposal["type"],
    version: row.version,
    targetRef: row.targetRef,
    artifactRevision: row.artifactRevision ?? undefined,
    canonicalArgsHash: row.canonicalArgsHash,
    permissionSnapshot: row.permissionSnapshot as Record<string, unknown>,
    expiresAt: row.expiresAt,
    riskSummary: row.riskSummary,
    status: row.status as ActionProposal["status"],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function computeProposalHashFor(input: {
  type: string;
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
