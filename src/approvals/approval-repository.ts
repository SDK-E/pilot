import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { approvals } from "@/db/schema";
export async function listApprovals(organizationId: string) {
  return db
    .select({
      id: approvals.id,
      summary: approvals.summary,
      status: approvals.status,
      createdAt: approvals.createdAt,
    })
    .from(approvals)
    .where(eq(approvals.organizationId, organizationId))
    .orderBy(desc(approvals.createdAt));
}
