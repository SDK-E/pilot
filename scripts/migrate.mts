/**
 * Applies pending Drizzle migrations over the same HTTP-only Neon driver
 * `src/db/client.ts` uses at runtime. `drizzle-kit migrate` selects
 * `@neondatabase/serverless`'s websocket driver regardless of dialect
 * config, and the Vercel build sandbox does not reliably permit outbound
 * websocket connections: the command exits inconsistently (0 or 1) while
 * never actually applying the pending migration. Neon's HTTP driver avoids
 * that dependency entirely.
 */
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run migrations.");
}

const db = drizzle({ client: neon(databaseUrl) });

await migrate(db, { migrationsFolder: "./drizzle" });
