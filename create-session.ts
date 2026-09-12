import { WorkOS } from "@workos-inc/node";
import { randomUUID } from "node:crypto";

const workos = new WorkOS(process.env.WORKOS_API_KEY!);

async function main() {
  const email = `browser-test-${randomUUID()}@example.com`;
  const password = randomUUID();
  
  // Create a test user
  const user = await workos.userManagement.createUser({
    email,
    password,
    emailVerified: true,
  });
  
  // Authenticate to get a sealed session
  const result = await workos.userManagement.authenticateWithPassword({
    clientId: process.env.WORKOS_CLIENT_ID!,
    email,
    password,
    session: {
      sealSession: true,
      cookiePassword: process.env.WORKOS_COOKIE_PASSWORD!,
    },
  });
  
  console.log("USER_ID:", user.id);
  console.log("SEALED_SESSION:", result.sealedSession);
  console.log("COOKIE_PASSWORD:", process.env.WORKOS_COOKIE_PASSWORD);
}

main().catch(console.error);