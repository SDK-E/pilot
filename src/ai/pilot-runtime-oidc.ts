import "server-only";

import { createRemoteJWKSet, decodeJwt, jwtVerify } from "jose";

const teamSlug = "sdk-enterprises";
const teamIssuer = `https://oidc.vercel.com/${teamSlug}`;
const globalIssuer = "https://oidc.vercel.com";
const audience = `https://vercel.com/${teamSlug}`;
const sourceProject = "pilot";
const tokenHeader = "x-pilot-runtime-oidc-token";

const verificationKeysByIssuer = new Map([
  [teamIssuer, createRemoteJWKSet(new URL(`${teamIssuer}/.well-known/jwks`))],
  [
    globalIssuer,
    createRemoteJWKSet(new URL(`${globalIssuer}/.well-known/jwks`)),
  ],
]);

function deploymentEnvironment(): "preview" | "production" | undefined {
  const environment = process.env.VERCEL_ENV;
  return environment === "preview" || environment === "production"
    ? environment
    : undefined;
}

/**
 * Verifies the original Pilot function token when Pilot AI calls the narrow
 * activity callback. The endpoint has no browser session and accepts no user
 * supplied organization identity.
 */
export async function verifyPilotRuntimeCallback(request: Request) {
  const token = request.headers.get(tokenHeader);
  const environment = deploymentEnvironment();
  if (!token || !environment) return false;

  try {
    const decoded = decodeJwt(token);
    const issuer = typeof decoded.iss === "string" ? decoded.iss : undefined;
    const verificationKeys = issuer
      ? verificationKeysByIssuer.get(issuer)
      : undefined;
    if (!issuer || !verificationKeys) return false;

    await jwtVerify(token, verificationKeys, {
      issuer,
      audience,
      subject: `owner:${teamSlug}:project:${sourceProject}:environment:${environment}`,
    });
    return true;
  } catch {
    return false;
  }
}
