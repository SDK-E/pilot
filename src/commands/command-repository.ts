import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { commands } from "@/db/schema";

export interface CommandConfiguration {
  name: string;
  description: string;
  promptTemplate: string;
}

const commandColumns = {
  id: commands.id,
  name: commands.name,
  description: commands.description,
  promptTemplate: commands.promptTemplate,
  archived: commands.archived,
  createdAt: commands.createdAt,
  updatedAt: commands.updatedAt,
};

export type Command = Awaited<ReturnType<typeof listCommands>>[number];

export async function createCommand(
  organizationId: string,
  createdByWorkosUserId: string,
  command: CommandConfiguration,
) {
  const [created] = await db
    .insert(commands)
    .values({ ...command, organizationId, createdByWorkosUserId })
    .returning(commandColumns);
  return created;
}

export async function updateCommand(
  organizationId: string,
  commandId: string,
  command: CommandConfiguration,
) {
  const [updated] = await db
    .update(commands)
    .set({ ...command, updatedAt: new Date() })
    .where(
      and(
        eq(commands.organizationId, organizationId),
        eq(commands.id, commandId),
      ),
    )
    .returning(commandColumns);
  return updated;
}

export async function archiveCommand(
  organizationId: string,
  commandId: string,
) {
  const [archived] = await db
    .update(commands)
    .set({ archived: true, updatedAt: new Date() })
    .where(
      and(
        eq(commands.organizationId, organizationId),
        eq(commands.id, commandId),
      ),
    )
    .returning({ id: commands.id });
  return archived;
}

export function listCommands(organizationId: string) {
  return db
    .select(commandColumns)
    .from(commands)
    .where(
      and(
        eq(commands.organizationId, organizationId),
        eq(commands.archived, false),
      ),
    )
    .orderBy(desc(commands.createdAt));
}

export async function getCommand(organizationId: string, commandId: string) {
  const [command] = await db
    .select(commandColumns)
    .from(commands)
    .where(
      and(
        eq(commands.organizationId, organizationId),
        eq(commands.id, commandId),
      ),
    )
    .limit(1);
  return command;
}
