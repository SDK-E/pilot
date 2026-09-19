import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import {
  exchangeDefinitionCode,
  fetchDefinitionAccountIdentifier,
} from "@/connectors/base-connector";
import {
  getDecryptedConnectorDefinition,
  saveConnectorConnection,
} from "@/connectors/connector-definition-repository";
import { verifyCustomOAuthState } from "@/connectors/oauth-state";
import { requireWorkspaceSession } from "@/organizations/workspace-session";

function callbackRedirectUrl(
  request: Request,
  outcome: "connected" | "error",
): URL {
  return new URL(`/settings?custom${outcome}=1#connectors`, request.url);
}

function callbackUrl(request: Request, definitionId: string): string {
  return new URL(`/api/connectors/custom/${definitionId}/callback`, request.url)
    .href;
}

/**
 * OAuth callback for one admin-defined custom connector. Mirrors the
 * built-in providers' callback (`[providerId]/callback/route.ts`): never a
 * raw 500 for an OAuth failure, real cause logged server-side only.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ definitionId: string }> },
) {
  const { definitionId } = await params;
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) {
    return NextResponse.json(
      { error: "Missing OAuth code or state." },
      { status: 400 },
    );
  }

  const payload = verifyCustomOAuthState(state);
  if (payload?.connectorDefinitionId !== definitionId) {
    return NextResponse.redirect(callbackRedirectUrl(request, "error"));
  }

  const session = await requireWorkspaceSession();
  if (
    session.organizationId !== payload.organizationId ||
    session.user.id !== payload.userId
  ) {
    return NextResponse.redirect(callbackRedirectUrl(request, "error"));
  }

  try {
    const definition = await getDecryptedConnectorDefinition({
      organizationId: payload.organizationId,
      id: definitionId,
    });
    if (!definition) throw new Error("Custom connector was not found.");

    const result = await exchangeDefinitionCode(definition, {
      code,
      redirectUri: callbackUrl(request, definitionId),
    });
    const accountIdentifier = await fetchDefinitionAccountIdentifier(
      definition,
      result.accessToken,
    );
    await saveConnectorConnection({
      organizationId: payload.organizationId,
      connectorDefinitionId: definitionId,
      scope: payload.scope,
      ownerWorkosUserId: payload.scope === "personal" ? payload.userId : null,
      accountIdentifier,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      tokenExpiresAt: result.expiresAt,
      grantedScopes: result.grantedScopes,
    });
  } catch (error) {
    // eslint-disable-next-line no-console -- only path to surface this server-side; never a raw 500 for an OAuth failure
    console.error(
      `Custom connector OAuth callback failed for ${definitionId}:`,
      error,
    );
    return NextResponse.redirect(callbackRedirectUrl(request, "error"));
  }

  revalidatePath("/settings");
  return NextResponse.redirect(callbackRedirectUrl(request, "connected"));
}
