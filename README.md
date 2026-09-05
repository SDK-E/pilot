# Pilot by SDK Enterprises

An open-source AI workforce platform in early development. The current slice implements WorkOS authentication, organization access, and persistent worker configuration. Durable execution is not implemented yet. See [implementation status](docs/progress.md) and [architecture decisions](docs/decisions/0001-platform-boundaries.md).

## Run locally

Use Node.js 24 and pnpm 11.25.0.

```sh
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

Configure your own WorkOS application's API key and client ID, a random cookie encryption secret of at least 32 characters, and the callback `http://localhost:3000/auth/callback`. Set the application's initiate-login URL to `http://localhost:3000/sign-in`, and homepage/sign-out URL to `http://localhost:3000`. Use an active organization membership to enter a workspace. Do not reuse another application's client ID. See the [official AuthKit guide](https://workos.com/docs/authkit/nextjs).

For the SDK Enterprises deployment, the project is linked to `sdk-enterprises/pilot`. After setup is complete, authorized maintainers can use `vercel env pull .env.local --environment development` to retrieve development configuration. Never pull production secrets into a local test environment.

## Verify

```sh
pnpm check
pnpm build
pnpm exec playwright install chromium
pnpm test
pnpm test:db
pnpm audit --audit-level high
```

The Playwright suite starts the production build on port 3100 with explicit test-only credentials. It checks public rendering and unauthenticated security boundaries. Successful hosted login, organization switching and logout must also be verified with a real WorkOS development environment; this suite does not prove those flows.

`pnpm test:db` uses the development Neon database to verify worker persistence and organization isolation, then removes its randomized fixtures. Apply committed schema changes with `pnpm db:migrate`; it uses `DATABASE_URL_UNPOOLED` when present. Never use development credentials to migrate preview or production.

## Deployment

Vercel is the target platform. Use the Next.js framework preset, Node.js 24, and environment-scoped WorkOS secrets. Neon database credentials are separate for development, preview and production. The initial Worker schema is migrated in each environment; worker runtime integration remains pending. The app can run with `pnpm build && pnpm start` on another Node host, but authentication currently depends on WorkOS.

Do not treat the current state as production-ready. Track remaining work and provisioning verification in [progress](docs/progress.md).
