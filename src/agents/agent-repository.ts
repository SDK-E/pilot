import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { firstRow } from "@/db/first-row";
import { members, organizations, workers } from "@/db/schema";

import { AGENT_KINDS, type AgentKindId } from "./agent-kinds";
import { defaultEnabledToolIds } from "./agent-tools";

export const DEFAULT_MODEL_ID = "kilo/kilo-auto/free";

export interface AgentConfiguration {
  name: string;
  instructions: string;
  modelId: string;
  baseAgentId: AgentKindId;
  goals?: string | null;
  tone?: string | null;
  outputFormat?: string | null;
  enabledToolIds: string[];
  enabledSkillIds?: string[];
}

export interface OrganizationContext {
  organization: { id: string; name: string };
  member: { id: string; roleSlug: string };
  user: { id: string; email: string };
}

const agentColumns = {
  id: workers.id,
  name: workers.name,
  instructions: workers.instructions,
  modelId: workers.modelId,
  baseAgentId: workers.baseAgentId,
  goals: workers.goals,
  tone: workers.tone,
  outputFormat: workers.outputFormat,
  enabledToolIds: workers.enabledToolIds,
  enabledSkillIds: workers.enabledSkillIds,
  archived: workers.archived,
  createdAt: workers.createdAt,
  updatedAt: workers.updatedAt,
};

export type Agent = Omit<
  typeof workers.$inferSelect,
  "organizationId" | "knowledgeSourceIds" | "createdByWorkosUserId"
>;

/**
 * Creates an agent, upserting the organization and member rows it hangs off.
 */
export async function createAgent(
  context: OrganizationContext,
  agent: AgentConfiguration,
) {
  const now = new Date();
  const created = await db.batch([
    db
      .insert(organizations)
      .values({
        id: context.organization.id,
        name: context.organization.name,
      })
      .onConflictDoUpdate({
        target: organizations.id,
        set: { name: context.organization.name, updatedAt: now },
      }),
    db
      .insert(members)
      .values({
        organizationId: context.organization.id,
        workosUserId: context.user.id,
        workosMembershipId: context.member.id,
        email: context.user.email,
        roleSlug: context.member.roleSlug,
      })
      .onConflictDoUpdate({
        target: [members.organizationId, members.workosUserId],
        set: {
          workosMembershipId: context.member.id,
          email: context.user.email,
          roleSlug: context.member.roleSlug,
          updatedAt: now,
        },
      }),
    db
      .insert(workers)
      .values({
        ...agent,
        organizationId: context.organization.id,
        knowledgeSourceIds: [],
        createdByWorkosUserId: context.user.id,
      })
      .returning({ id: workers.id, name: workers.name }),
  ]);
  return firstRow(created[2]);
}

export async function updateAgent(
  organizationId: string,
  agentId: string,
  agent: AgentConfiguration,
) {
  const [updated] = await db
    .update(workers)
    .set({ ...agent, updatedAt: new Date() })
    .where(
      and(eq(workers.organizationId, organizationId), eq(workers.id, agentId)),
    )
    .returning({ id: workers.id, name: workers.name });
  return updated;
}

export async function archiveAgent(organizationId: string, agentId: string) {
  const [archived] = await db
    .update(workers)
    .set({ archived: true, updatedAt: new Date() })
    .where(
      and(eq(workers.organizationId, organizationId), eq(workers.id, agentId)),
    )
    .returning({ id: workers.id });
  return archived;
}

export function listAgents(organizationId: string) {
  return db
    .select(agentColumns)
    .from(workers)
    .where(
      and(
        eq(workers.organizationId, organizationId),
        eq(workers.archived, false),
      ),
    )
    .orderBy(desc(workers.createdAt));
}

export async function getAgent(organizationId: string, agentId: string) {
  const [agent] = await db
    .select(agentColumns)
    .from(workers)
    .where(
      and(eq(workers.organizationId, organizationId), eq(workers.id, agentId)),
    )
    .limit(1);
  return agent;
}

async function newestAgentOfKind(organizationId: string, kind: AgentKindId) {
  const [agent] = await db
    .select(agentColumns)
    .from(workers)
    .where(
      and(
        eq(workers.organizationId, organizationId),
        eq(workers.baseAgentId, kind),
        eq(workers.archived, false),
      ),
    )
    .orderBy(desc(workers.createdAt))
    .limit(1);
  return agent;
}

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

/**
 * Un-archives the org's default agent for a mode when its reserved name
 * (e.g. "Pilot Chat") already belongs to a row the user archived earlier.
 * `workers_organization_name_unique` isn't scoped to non-archived rows, so
 * that archived row is the only thing a fresh insert could have collided
 * with — a concurrent creator's row would already be non-archived and found
 * by `newestAgentOfKind`.
 */
async function reactivateArchivedDefaultAgent(
  organizationId: string,
  kind: AgentKindId,
  name: string,
) {
  const [reactivated] = await db
    .update(workers)
    .set({ archived: false, updatedAt: new Date() })
    .where(
      and(
        eq(workers.organizationId, organizationId),
        eq(workers.baseAgentId, kind),
        eq(workers.name, name),
      ),
    )
    .returning(agentColumns);
  return reactivated;
}

/**
 * The organization's agent for a mode, creating Pilot's built-in one on first
 * use. Two concurrent first messages race on the unique name; the loser reads
 * the winner's row. An archived default agent is reactivated instead of
 * blocking creation forever.
 */
export async function ensureDefaultAgent(
  context: OrganizationContext,
  kind: AgentKindId,
) {
  const existing = await newestAgentOfKind(context.organization.id, kind);
  if (existing) return existing;
  const { defaultAgent } = AGENT_KINDS[kind];
  try {
    await createAgent(context, {
      name: defaultAgent.name,
      instructions: defaultAgent.instructions,
      modelId: DEFAULT_MODEL_ID,
      baseAgentId: kind,
      enabledToolIds: [...defaultEnabledToolIds],
    });
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
  }
  const created = await newestAgentOfKind(context.organization.id, kind);
  if (created) return created;
  return reactivateArchivedDefaultAgent(
    context.organization.id,
    kind,
    defaultAgent.name,
  );
}
