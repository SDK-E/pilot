import { NextResponse } from "next/server";

import { buildDefinitionAuthorizeUrl } from "@/connectors/base-connector";
import { getDecryptedConnectorDefinition } from "@/connectors/connector-definition-repository";
import { signCustomOAuthState } from "@/connectors/oauth-state";
import { requireWorkspaceSession } from "@/organizations/workspace-session";

const ADMIN_ROLES = new Set(["owner", "admin"]);

function callbackUrl(request: Request, definitionId: string): string {
  return new URL(`/api/connectors/custom/${definitionId}/callback`, request.url)
    .href;
}

/**
 * Starts the OAuth flow for one connector, either its shared org-wide
 * connection (admin-only) or the caller's own personal connection (any
 * member, only when the definition's `allowPersonalConnections` is on).
 * `?scope=personal` requests the latter; anything else means org-wide.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ definitionId: string }> },
) {
  const { definitionId } = await params;
  const url = new URL(request.url);
  const scope =
    url.searchParams.get("scope") === "personal"
      ? ("personal" as const)
      : ("organization" as const);
  const session = await requireWorkspaceSession();

  const definition = await getDecryptedConnectorDefinition({
    organizationId: session.organizationId,
    id: definitionId,
  });
  if (!definition) {
    return NextResponse.json({ error: "Unknown connector." }, { status: 404 });
  }

  if (
    scope === "organization" &&
    !ADMIN_ROLES.has(session.membership.role.slug)
  ) {
    return NextResponse.json(
      {
        error:
          "Only organization owners and admins can connect the shared connection.",
      },
      { status: 403 },
    );
  }
  if (scope === "personal" && !definition.allowPersonalConnections) {
    return NextResponse.json(
      { error: "This connector doesn't allow personal connections." },
      { status: 403 },
    );
  }

  const state = signCustomOAuthState({
    organizationId: session.organizationId,
    userId: session.user.id,
    connectorDefinitionId: definition.id,
    scope,
  });
  const redirectUri = callbackUrl(request, definition.id);

  return NextResponse.redirect(
    buildDefinitionAuthorizeUrl(definition, { redirectUri, state }),
    { status: 302 },
  );
}
