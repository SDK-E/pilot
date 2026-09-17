/**
 * Grants the first platform superadmin — a one-time bootstrap, since the
 * admin panel that manages `platform_admins` afterward requires being a
 * platform admin to open. Safe to re-run: upserts by WorkOS user id.
 *
 * Usage: pnpm admin:bootstrap <workos-user-id> <email>
 */
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import { platformAdmins } from "../src/db/schema/platform.js";

const [workosUserId, email] = process.argv.slice(2);
if (!workosUserId?.startsWith("user_") || !email?.includes("@")) {
  throw new Error(
    "Usage: pnpm admin:bootstrap <workos-user-id> <email>\n" +
      "Find your WorkOS user id in the WorkOS dashboard, or from Pilot's own session (it's the `user.id` withAuth() returns).",
  );
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to bootstrap a platform admin.");
}

const db = drizzle({ client: neon(databaseUrl) });

const [admin] = await db
  .insert(platformAdmins)
  .values({
    workosUserId,
    email,
    role: "superadmin",
    addedByWorkosUserId: workosUserId,
  })
  .onConflictDoUpdate({
    target: platformAdmins.workosUserId,
    set: { role: "superadmin", email },
  })
  .returning({ id: platformAdmins.id, email: platformAdmins.email });

if (!admin) throw new Error("Could not save the platform admin.");
process.stdout.write(`${admin.email} is now a platform superadmin.\n`);
