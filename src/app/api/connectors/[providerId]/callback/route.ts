import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { upsertConnectorConnection } from "@/connectors/connector-connection-mutations";
import {
  connectorProvider,
  isConnectorProviderId,
} from "@/connectors/connector-providers";
import { verifyOAuthState } from "@/connectors/oauth-state";
import { requireWorkspaceSession } from "@/organizations/workspace-session";

// The query string must precede the fragment (`?x#y`, not `#y?x`) — a
// leading `#` makes everything after it part of the fragment, not a real
// query string a page could ever read.
function callbackRedirectUrl(
  request: Request,
  providerId: string,
  outcome: "connected" | "error",
): URL {
  const url = new URL(
    `/settings?${outcome}=${providerId}#connectors`,
    request.url,
  );
  return url;
}

function callbackUrl(request: Request, providerId: string): string {
  return new URL(`/api/connectors/${providerId}/callback`, request.url).href;
}

function errorRedirect(request: Request, providerId: string): NextResponse {
  return NextResponse.redirect(
    callbackRedirectUrl(request, providerId, "error"),
  );
}

/**
 * OAuth callback for a connector provider. Never throws a raw 500 for an
 * OAuth failure — every failure past state verification redirects to a
 * settings error state, with the real cause logged server-side only.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ providerId: string }> },
) {
  const { providerId } = await params;
  if (!isConnectorProviderId(providerId)) {
    return NextResponse.json({ error: "Unknown connector." }, { status: 404 });
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) {
    return NextResponse.json(
      { error: "Missing OAuth code or state." },
      { status: 400 },
    );
  }

  const payload = verifyOAuthState(state);
  // eslint-disable-next-line @typescript-eslint/prefer-optional-chain -- keeps `payload` narrowed to non-null below
  if (!payload || payload.providerId !== providerId) {
    return errorRedirect(request, providerId);
  }

  const session = await requireWorkspaceSession();
  if (
    session.organizationId !== payload.organizationId ||
    session.user.id !== payload.userId
  ) {
    // A different session than the one that started this flow hit the
    // callback URL — treat exactly like an invalid/expired state.
    return errorRedirect(request, providerId);
  }

  try {
    const provider = connectorProvider(providerId);
    const result = await provider.exchangeCode({
      code,
      redirectUri: callbackUrl(request, providerId),
    });
    const accountIdentifier = await provider.fetchAccountIdentifier(
      result.accessToken,
    );
    await upsertConnectorConnection({
      organizationId: payload.organizationId,
      ownerScope: payload.ownerScope,
      ownerWorkosUserId: payload.ownerScope === "user" ? payload.userId : null,
      providerId,
      accountIdentifier,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      tokenExpiresAt: result.expiresAt,
      grantedScopes: result.grantedScopes,
      createdByWorkosUserId: session.user.id,
    });
  } catch (error) {
    // eslint-disable-next-line no-console -- only path to surface this server-side; never a raw 500 for an OAuth failure
    console.error(`Connector OAuth callback failed for ${providerId}:`, error);
    return errorRedirect(request, providerId);
  }

  // Matches every settings Server Action's own pattern after a mutation
  // (src/app/(workspace)/settings/actions.ts) — the redirect below is a
  // hard navigation so the Settings page re-fetches regardless, but this
  // keeps the callback route consistent with how every other write here
  // invalidates the page, rather than relying solely on it being dynamic.
  revalidatePath("/settings");

  return NextResponse.redirect(
    callbackRedirectUrl(request, providerId, "connected"),
  );
}
