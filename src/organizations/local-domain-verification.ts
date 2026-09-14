import "server-only";

import { randomUUID } from "node:crypto";
import dns from "node:dns/promises";

import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { firstRow } from "@/db/first-row";
import { organizationDomains } from "@/db/schema";

const BLOCKED_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "yahoo.com",
  "icloud.com",
  "me.com",
  "aol.com",
  "protonmail.com",
  "proton.me",
]);

const DOMAIN_PATTERN =
  /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;

const TXT_PREFIX = "pilot-domain-verify=";

export interface OrganizationDomain {
  id: string;
  domain: string;
  status: "pending" | "verified";
  verificationToken: string;
}

function verificationRecord(token: string): string {
  return `${TXT_PREFIX}${token}`;
}

/**
 * Starts verifying a domain for a local organization: rejects common public
 * email providers and requires the domain to match the requester's own
 * email (an anti-squatting nicety — the real guarantee is the DNS check in
 * `verifyOrganizationDomain`). Records a pending row with a fresh token.
 */
export async function addOrganizationDomain(input: {
  organizationId: string;
  domain: string;
  requesterEmail: string;
}): Promise<OrganizationDomain> {
  const domain = input.domain.trim().toLowerCase();
  if (!DOMAIN_PATTERN.test(domain)) {
    throw new Error("Enter a valid domain, like acme.com.");
  }
  if (BLOCKED_DOMAINS.has(domain)) {
    throw new Error(
      "Personal email providers can't be verified as an organization domain.",
    );
  }
  const requesterDomain = input.requesterEmail.split("@", 2)[1]?.toLowerCase();
  if (requesterDomain !== domain) {
    throw new Error(
      "You can only add a domain that matches your own email address.",
    );
  }

  const rows = await db
    .insert(organizationDomains)
    .values({
      organizationId: input.organizationId,
      domain,
      verificationToken: randomUUID(),
    })
    .onConflictDoNothing({ target: organizationDomains.domain })
    .returning();
  const row = rows[0];
  if (!row) {
    throw new Error(
      "This domain has already been claimed by another workspace.",
    );
  }
  return row;
}

/**
 * Checks DNS for the expected TXT record and marks the domain verified on a
 * match. Pilot's own equivalent of WorkOS's domain-verification flow.
 */
export async function verifyOrganizationDomain(
  organizationDomainId: string,
): Promise<OrganizationDomain> {
  const [existing] = await db
    .select()
    .from(organizationDomains)
    .where(eq(organizationDomains.id, organizationDomainId))
    .limit(1);
  if (!existing) throw new Error("Domain not found.");
  if (existing.status === "verified") return existing;

  let records: string[][];
  try {
    records = await dns.resolveTxt(existing.domain);
  } catch {
    throw new Error(
      "Couldn't read DNS records for that domain yet. DNS changes can take a few minutes to propagate.",
    );
  }
  const expected = verificationRecord(existing.verificationToken);
  const hasMatch = records.some((chunks) => chunks.join("") === expected);
  if (!hasMatch) {
    throw new Error(
      `TXT record not found yet. Add "${expected}" to ${existing.domain}'s DNS and try again.`,
    );
  }

  const rows = await db
    .update(organizationDomains)
    .set({ status: "verified", verifiedAt: new Date() })
    .where(eq(organizationDomains.id, organizationDomainId))
    .returning();
  return firstRow(rows);
}

export async function listOrganizationDomains(
  organizationId: string,
): Promise<OrganizationDomain[]> {
  return db
    .select()
    .from(organizationDomains)
    .where(eq(organizationDomains.organizationId, organizationId));
}
