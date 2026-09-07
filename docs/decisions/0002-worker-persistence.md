# Worker persistence boundary

Status: accepted for the first persistent-worker slice.

Pilot uses Drizzle ORM `0.45.2`, Drizzle Kit `0.31.10`, and Neon's GA serverless driver `1.1.0`. Drizzle is a small, type-safe PostgreSQL layer with maintained Neon support and generated SQL migrations. It replaces neither the Pilot domain nor the database: Pilot owns the schema and authorization rules.

The application uses Drizzle's Neon HTTP driver with `DATABASE_URL`. It suits request-scoped reads and writes, while Neon supports non-interactive batches as a transaction. Migrations use the same environment-specific `DATABASE_URL`. If future work needs session state or interactive transactions, use Neon's WebSocket driver rather than emulating transactions in application code.

The first schema intentionally contains only the domain records that work now:

- `organizations` mirrors the active WorkOS organization identifier and name when a worker is created.
- `members` records the verified WorkOS membership that performed the mutation.
- `workers` persists a unique organization-scoped name, instructions, model ID, creator and timestamps.

Every worker creation action authenticates the session, requires a selected organization, rechecks an active WorkOS membership for that exact user and organization, and only then writes Pilot records. Database foreign keys and an organization/name uniqueness constraint protect structural integrity. Database RLS is not enabled yet because the current Neon application credential is the owner role; do not claim it as a tenant-isolation boundary. The application authorization check remains mandatory on every read and mutation.

The generated migration is committed under `drizzle/` and applied to the isolated development, preview, and production projects. `pnpm test:db` uses randomized short-lived fixture IDs against the development database and deletes the fixtures after asserting persistence, duplicate rejection, and organization isolation.

## Sources checked on 2026-09-05

- [Drizzle with Neon](https://orm.drizzle.team/docs/connect-neon) — native HTTP and WebSocket Neon drivers, including when interactive transactions require WebSockets.
- [Neon serverless driver](https://neon.com/docs/serverless/serverless-driver) — GA `1.0+`, HTTP query safety and transaction behavior.
- [Drizzle migration generation](https://orm.drizzle.team/docs/drizzle-kit-generate) and [migration application](https://orm.drizzle.team/docs/drizzle-kit-migrate).
- [Drizzle ORM repository](https://github.com/drizzle-team/drizzle-orm) — Apache-2.0, active `0.45.2` release at the time of selection.
