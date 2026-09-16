/**
 * Drops and recreates the public schema, then reapplies every migration —
 * a full reset for local development. Requires typing the database host
 * back to confirm, since this permanently destroys all data with no undo.
 * Set CONFIRM_RESET=yes to skip the prompt for scripted use.
 */
import readline from "node:readline/promises";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to reset the database.");
}

const host = new URL(databaseUrl).hostname;

if (process.env.CONFIRM_RESET !== "yes") {
  process.stdout.write(`This will PERMANENTLY DELETE ALL DATA in: ${host}\n`);
  process.stdout.write("This cannot be undone.\n");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const answer = await rl.question("Type the database host to confirm: ");
  rl.close();
  if (answer.trim() !== host) {
    throw new Error("Confirmation did not match. Aborting.");
  }
}

const client = neon(databaseUrl);
await client`DROP SCHEMA public CASCADE`;
await client`CREATE SCHEMA public`;
process.stdout.write("Schema dropped and recreated.\n");

const db = drizzle({ client });
await migrate(db, { migrationsFolder: "./drizzle" });
process.stdout.write("Migrations reapplied. Database reset complete.\n");
