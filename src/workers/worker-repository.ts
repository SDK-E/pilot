import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { members, organizations, workers } from "@/db/schema";
import type {
  ApprovalRules,
  BaseAgentId,
  ConfigurableToolId,
} from "@/agents/agent-configuration";
type WorkerMembership = {
  id: string;
  roleSlug: string;
};

type CreateWorkerInput = {
  organization: { id: string; name: string };
  member: WorkerMembership;
  user: { id: string; email: string };
  worker: {
    name: string;
    instructions: string;
    modelId: string;
    baseAgentId: BaseAgentId;
    goals?: string | null;
    tone?: string | null;
    outputFormat?: string | null;
    enabledToolIds: ConfigurableToolId[];
    knowledgeSourceIds: string[];
    approvalRules: ApprovalRules;
  };
};

type WorkerConfiguration = CreateWorkerInput["worker"];

export async function createWorker(input: CreateWorkerInput) {
  const now = new Date();
  const [, , createdWorkers] = await db.batch([
    db
      .insert(organizations)
      .values({ id: input.organization.id, name: input.organization.name })
      .onConflictDoUpdate({
        target: organizations.id,
        set: { name: input.organization.name, updatedAt: now },
      }),
    db
      .insert(members)
      .values({
        organizationId: input.organization.id,
        workosUserId: input.user.id,
        workosMembershipId: input.member.id,
        email: input.user.email,
        roleSlug: input.member.roleSlug,
      })
      .onConflictDoUpdate({
        target: [members.organizationId, members.workosUserId],
        set: {
          workosMembershipId: input.member.id,
          email: input.user.email,
          roleSlug: input.member.roleSlug,
          updatedAt: now,
        },
      }),
    db
      .insert(workers)
      .values({
        organizationId: input.organization.id,
        name: input.worker.name,
        instructions: input.worker.instructions,
        modelId: input.worker.modelId,
        baseAgentId: input.worker.baseAgentId,
        goals: input.worker.goals,
        tone: input.worker.tone,
        outputFormat: input.worker.outputFormat,
        enabledToolIds: input.worker.enabledToolIds,
        knowledgeSourceIds: input.worker.knowledgeSourceIds,
        approvalRules: input.worker.approvalRules,
        createdByWorkosUserId: input.user.id,
      })
      .returning({
        id: workers.id,
        name: workers.name,
        archived: workers.archived,
      }),
  ]);

  return createdWorkers[0];
}

export async function updateWorker(
  organizationId: string,
  workerId: string,
  worker: WorkerConfiguration,
) {
  const [updated] = await db
    .update(workers)
    .set({ ...worker, updatedAt: new Date() })
    .where(
      and(eq(workers.organizationId, organizationId), eq(workers.id, workerId)),
    )
    .returning({
      id: workers.id,
      name: workers.name,
      archived: workers.archived,
    });
  return updated;
}

export async function deleteWorker(organizationId: string, workerId: string) {
  const [archived] = await db
    .update(workers)
    .set({ archived: true, updatedAt: new Date() })
    .where(
      and(eq(workers.organizationId, organizationId), eq(workers.id, workerId)),
    )
    .returning({ id: workers.id, archived: workers.archived });
  return archived;
}

export async function listWorkers(organizationId: string) {
  return db
    .select({
      id: workers.id,
      name: workers.name,
      instructions: workers.instructions,
      modelId: workers.modelId,
      baseAgentId: workers.baseAgentId,
      goals: workers.goals,
      tone: workers.tone,
      outputFormat: workers.outputFormat,
      enabledToolIds: workers.enabledToolIds,
      knowledgeSourceIds: workers.knowledgeSourceIds,
      approvalRules: workers.approvalRules,
      archived: workers.archived,
      createdAt: workers.createdAt,
    })
    .from(workers)
    .where(eq(workers.organizationId, organizationId))
    .orderBy(desc(workers.createdAt));
}

export async function getWorker(organizationId: string, workerId: string) {
  const [worker] = await db
    .select({
      id: workers.id,
      name: workers.name,
      instructions: workers.instructions,
      modelId: workers.modelId,
      baseAgentId: workers.baseAgentId,
      goals: workers.goals,
      tone: workers.tone,
      outputFormat: workers.outputFormat,
      enabledToolIds: workers.enabledToolIds,
      knowledgeSourceIds: workers.knowledgeSourceIds,
      approvalRules: workers.approvalRules,
      archived: workers.archived,
      createdAt: workers.createdAt,
      updatedAt: workers.updatedAt,
    })
    .from(workers)
    .where(
      and(eq(workers.organizationId, organizationId), eq(workers.id, workerId)),
    )
    .limit(1);

  return worker;
}

export async function getWorkerByBaseAgentId(
  organizationId: string,
  baseAgentId: BaseAgentId,
) {
  const [worker] = await db
    .select({ id: workers.id })
    .from(workers)
    .where(
      and(
        eq(workers.organizationId, organizationId),
        eq(workers.baseAgentId, baseAgentId),
      ),
    )
    .orderBy(desc(workers.createdAt))
    .limit(1);

  return worker;
}
