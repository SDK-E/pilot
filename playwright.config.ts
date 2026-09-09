import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  use: { baseURL: "http://localhost:3100", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm start --port 3100",
    url: "http://localhost:3100",
    reuseExistingServer: false,
    env: {
      // These tests exercise unauthenticated boundaries, not a mocked login.
      WORKOS_API_KEY: "sk_test_pilot_boundary_tests",
      WORKOS_CLIENT_ID: "client_pilot_boundary_tests",
      WORKOS_COOKIE_PASSWORD:
        "pilot-boundary-tests-only-do-not-use-in-deployments",
      NEXT_PUBLIC_WORKOS_REDIRECT_URI: "http://localhost:3100/auth/callback",
    },
  },
});
