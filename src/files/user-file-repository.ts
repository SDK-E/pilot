import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { userFiles } from "@/db/schema";

interface Owner {
  organizationId: string;
  userId: string;
}

const fileFields = {
  id: userFiles.id,
  pathname: userFiles.pathname,
  filename: userFiles.filename,
  contentType: userFiles.contentType,
  byteSize: userFiles.byteSize,
  createdAt: userFiles.createdAt,
};

export function listUserFiles(input: Owner) {
  return db
    .select(fileFields)
    .from(userFiles)
    .where(
      and(
        eq(userFiles.organizationId, input.organizationId),
        eq(userFiles.createdByWorkosUserId, input.userId),
      ),
    )
    .orderBy(asc(userFiles.createdAt));
}

export async function createUserFile(
  input: Owner & {
    pathname: string;
    filename: string;
    contentType: string;
    byteSize: number;
  },
) {
  const [file] = await db
    .insert(userFiles)
    .values({
      organizationId: input.organizationId,
      createdByWorkosUserId: input.userId,
      pathname: input.pathname,
      filename: input.filename,
      contentType: input.contentType,
      byteSize: input.byteSize,
    })
    .returning({ id: userFiles.id });
  return file;
}

export async function getUserFile(input: Owner & { fileId: string }) {
  const [file] = await db
    .select(fileFields)
    .from(userFiles)
    .where(
      and(
        eq(userFiles.id, input.fileId),
        eq(userFiles.organizationId, input.organizationId),
        eq(userFiles.createdByWorkosUserId, input.userId),
      ),
    )
    .limit(1);
  return file;
}

export async function deleteUserFile(input: Owner & { fileId: string }) {
  const [file] = await db
    .delete(userFiles)
    .where(
      and(
        eq(userFiles.id, input.fileId),
        eq(userFiles.organizationId, input.organizationId),
        eq(userFiles.createdByWorkosUserId, input.userId),
      ),
    )
    .returning({ pathname: userFiles.pathname });
  return file;
}

export function listTextExtractableUserFiles(input: Owner) {
  return db
    .select({
      pathname: userFiles.pathname,
      filename: userFiles.filename,
      contentType: userFiles.contentType,
      byteSize: userFiles.byteSize,
    })
    .from(userFiles)
    .where(
      and(
        eq(userFiles.organizationId, input.organizationId),
        eq(userFiles.createdByWorkosUserId, input.userId),
      ),
    )
    .orderBy(asc(userFiles.createdAt));
}
