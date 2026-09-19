import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { organizationPreferences, workers } from "@/db/schema";

interface OrganizationPreferences {
  defaultWorkerId: string | null;
  primaryModelId: string;
  retryEnabled: boolean;
  webSearchEnabled: boolean;
  codeSandboxEnabled: boolean;
  standingInstructions: string | null;
}

const defaults: OrganizationPreferences = {
  defaultWorkerId: null,
  primaryModelId: "kilo/kilo-auto/free",
  retryEnabled: true,
  webSearchEnabled: true,
  codeSandboxEnabled: true,
  standingInstructions: null,
};

export async function getOrganizationPreferences(organizationId: string) {
  const [preferences] = await db
    .select({
      defaultWorkerId: organizationPreferences.defaultWorkerId,
      primaryModelId: organizationPreferences.primaryModelId,
      retryEnabled: organizationPreferences.retryEnabled,
      webSearchEnabled: organizationPreferences.webSearchEnabled,
      codeSandboxEnabled: organizationPreferences.codeSandboxEnabled,
      standingInstructions: organizationPreferences.standingInstructions,
    })
    .from(organizationPreferences)
    .where(eq(organizationPreferences.organizationId, organizationId))
    .limit(1);
  return preferences ?? defaults;
}

export async function updateOrganizationStandingInstructions(input: {
  organizationId: string;
  standingInstructions: string | null;
}) {
  const [preferences] = await db
    .insert(organizationPreferences)
    .values(input)
    .onConflictDoUpdate({
      target: organizationPreferences.organizationId,
      set: {
        standingInstructions: input.standingInstructions,
        updatedAt: new Date(),
      },
    })
    .returning({
      standingInstructions: organizationPreferences.standingInstructions,
    });
  return preferences;
}

export async function updateOrganizationDefaultWorker(input: {
  organizationId: string;
  defaultWorkerId: string;
}) {
  const [worker] = await db
    .select({ id: workers.id })
    .from(workers)
    .where(
      and(
        eq(workers.id, input.defaultWorkerId),
        eq(workers.organizationId, input.organizationId),
      ),
    )
    .limit(1);
  if (!worker) return;

  const [preferences] = await db
    .insert(organizationPreferences)
    .values({
      organizationId: input.organizationId,
      defaultWorkerId: worker.id,
    })
    .onConflictDoUpdate({
      target: organizationPreferences.organizationId,
      set: { defaultWorkerId: worker.id, updatedAt: new Date() },
    })
    .returning({ defaultWorkerId: organizationPreferences.defaultWorkerId });
  return preferences;
}

export async function updateOrganizationModelPolicy(input: {
  organizationId: string;
  primaryModelId: string;
  retryEnabled: boolean;
}) {
  const [preferences] = await db
    .insert(organizationPreferences)
    .values(input)
    .onConflictDoUpdate({
      target: organizationPreferences.organizationId,
      set: {
        primaryModelId: input.primaryModelId,
        retryEnabled: input.retryEnabled,
        updatedAt: new Date(),
      },
    })
    .returning({
      primaryModelId: organizationPreferences.primaryModelId,
      retryEnabled: organizationPreferences.retryEnabled,
    });
  return preferences;
}

export async function updateOrganizationCapabilities(input: {
  organizationId: string;
  webSearchEnabled: boolean;
  codeSandboxEnabled: boolean;
}) {
  const [preferences] = await db
    .insert(organizationPreferences)
    .values(input)
    .onConflictDoUpdate({
      target: organizationPreferences.organizationId,
      set: {
        webSearchEnabled: input.webSearchEnabled,
        codeSandboxEnabled: input.codeSandboxEnabled,
        updatedAt: new Date(),
      },
    })
    .returning({
      webSearchEnabled: organizationPreferences.webSearchEnabled,
      codeSandboxEnabled: organizationPreferences.codeSandboxEnabled,
    });
  return preferences;
}
