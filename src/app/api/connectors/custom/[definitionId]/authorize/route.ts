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
 * Starts the OAuth flow for one admin-defined custom connector. Custom
 * connectors are organization-wide only (no personal-scope variant), so
 * only an admin may connect one — unlike the built-in providers, which let
 * any member connect their own personal account.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ definitionId: string }> },
) {
  const { definitionId } = await params;
  const session = await requireWorkspaceSession();
  if (!ADMIN_ROLES.has(session.membership.role.slug)) {
    return NextResponse.json(
      {
        error:
          "Only organization owners and admins can connect a custom connector.",
      },
      { status: 403 },
    );
  }

  const definition = await getDecryptedConnectorDefinition({
    organizationId: session.organizationId,
    id: definitionId,
  });
  if (!definition) {
    return NextResponse.json({ error: "Unknown connector." }, { status: 404 });
  }

  const state = signCustomOAuthState({
    organizationId: session.organizationId,
    userId: session.user.id,
    connectorDefinitionId: definition.id,
  });
  const redirectUri = callbackUrl(request, definition.id);

  return NextResponse.redirect(
    buildDefinitionAuthorizeUrl(definition, { redirectUri, state }),
    { status: 302 },
  );
}
