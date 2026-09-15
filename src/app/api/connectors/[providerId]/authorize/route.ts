import { NextResponse } from "next/server";

import {
  connectorProvider,
  isConnectorProviderId,
} from "@/connectors/connector-providers";
import { signOAuthState } from "@/connectors/oauth-state";
import { requireWorkspaceSession } from "@/organizations/workspace-session";

const ADMIN_ROLES = new Set(["owner", "admin"]);

function callbackUrl(request: Request, providerId: string): string {
  return new URL(`/api/connectors/${providerId}/callback`, request.url).href;
}

/**
 * Starts the OAuth authorization-code flow for a connector provider. A
 * plain full-page redirect (never a client-side fetch) — the provider needs
 * to own the browser's navigation.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ providerId: string }> },
) {
  const { providerId } = await params;
  if (!isConnectorProviderId(providerId)) {
    return NextResponse.json({ error: "Unknown connector." }, { status: 404 });
  }

  const session = await requireWorkspaceSession();

  const scopeParam = new URL(request.url).searchParams.get("scope");
  const ownerScope: "organization" | "user" =
    scopeParam === "organization" ? "organization" : "user";
  if (
    ownerScope === "organization" &&
    !ADMIN_ROLES.has(session.membership.role.slug)
  ) {
    return NextResponse.json(
      { error: "Only organization owners and admins can connect for everyone." },
      { status: 403 },
    );
  }

  const provider = connectorProvider(providerId);
  const state = signOAuthState({
    organizationId: session.organizationId,
    userId: session.user.id,
    providerId,
    ownerScope,
  });

  const authorizeUrl = new URL(provider.authorizeUrl);
  authorizeUrl.searchParams.set("client_id", process.env[provider.clientIdEnvVar] ?? "");
  authorizeUrl.searchParams.set("redirect_uri", callbackUrl(request, providerId));
  authorizeUrl.searchParams.set("scope", provider.scopes.join(" "));
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("response_type", "code");

  return NextResponse.redirect(authorizeUrl, { status: 302 });
}
