// One-time build-step diagnostic: migration 0032 reported success in the
// Vercel build log on 2026-09-14 but production queries against
// conversation_plans failed with "relation does not exist". This runs the
// same idempotent DDL directly (bypassing drizzle-kit's journal bookkeeping)
// and logs the before/after state so the build log proves what happened.
// Remove this script and its buildCommand hook once verified.
import { readFileSync } from "node:fs";

import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

async function hasConversationPlansTable() {
  const [row] =
    await sql`SELECT to_regclass('public.conversation_plans') AS reg`;
  return row.reg !== null;
}

const wasTablePresent = await hasConversationPlansTable();
console.log(
  `[repair] conversation_plans exists before repair: ${wasTablePresent}`,
);

if (!wasTablePresent) {
  const ddl = readFileSync(
    new URL("drizzle/0032_conversation_plans.sql", import.meta.url),
    "utf8",
  );
  const statements = ddl
    .split(/;\s*\n/)
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0 && !statement.startsWith("--"));
  for (const statement of statements) {
    console.log(`[repair] executing: ${statement.slice(0, 60)}...`);
    await sql.query(statement);
  }
}

const hasTableAfter = await hasConversationPlansTable();
console.log(
  `[repair] conversation_plans exists after repair: ${hasTableAfter}`,
);
if (!hasTableAfter) {
  throw new Error("[repair] FAILED: table still missing after direct DDL run");
}
console.log("[repair] OK");
