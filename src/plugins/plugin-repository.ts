import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { plugins } from "@/db/schema";

export interface PluginConfiguration {
  name: string;
  description: string;
  commandIds: string[];
  toolIds: string[];
}

const pluginColumns = {
  id: plugins.id,
  name: plugins.name,
  description: plugins.description,
  commandIds: plugins.commandIds,
  toolIds: plugins.toolIds,
  archived: plugins.archived,
  createdAt: plugins.createdAt,
  updatedAt: plugins.updatedAt,
};

export type Plugin = Awaited<ReturnType<typeof listPlugins>>[number];

export async function createPlugin(
  organizationId: string,
  createdByWorkosUserId: string,
  plugin: PluginConfiguration,
) {
  const [created] = await db
    .insert(plugins)
    .values({ ...plugin, organizationId, createdByWorkosUserId })
    .returning(pluginColumns);
  return created;
}

export async function updatePlugin(
  organizationId: string,
  pluginId: string,
  plugin: PluginConfiguration,
) {
  const [updated] = await db
    .update(plugins)
    .set({ ...plugin, updatedAt: new Date() })
    .where(
      and(eq(plugins.organizationId, organizationId), eq(plugins.id, pluginId)),
    )
    .returning(pluginColumns);
  return updated;
}

export async function archivePlugin(organizationId: string, pluginId: string) {
  const [archived] = await db
    .update(plugins)
    .set({ archived: true, updatedAt: new Date() })
    .where(
      and(eq(plugins.organizationId, organizationId), eq(plugins.id, pluginId)),
    )
    .returning({ id: plugins.id });
  return archived;
}

export function listPlugins(organizationId: string) {
  return db
    .select(pluginColumns)
    .from(plugins)
    .where(
      and(
        eq(plugins.organizationId, organizationId),
        eq(plugins.archived, false),
      ),
    )
    .orderBy(desc(plugins.createdAt));
}

export async function getPlugin(organizationId: string, pluginId: string) {
  const [plugin] = await db
    .select(pluginColumns)
    .from(plugins)
    .where(
      and(eq(plugins.organizationId, organizationId), eq(plugins.id, pluginId)),
    )
    .limit(1);
  return plugin;
}
