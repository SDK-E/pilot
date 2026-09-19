import {
  listConnectorDefinitions,
  resolveConnectorConnection,
} from "@/connectors/connector-definition-repository";
import {
  getWorkspaceSession,
  isWorkspaceSession,
  sessionFailureResponse,
} from "@/organizations/workspace-session";

export const runtime = "nodejs";

interface SelectableConnector {
  slug: string;
  displayName: string;
  icon: string | null;
}

/**
 * The composer's per-connector picker options: every active connector the
 * signed-in user can actually use right now — an org-wide connection, or
 * (when the definition allows it) their own personal one.
 */
export async function GET() {
  const session = await getWorkspaceSession();
  if (!isWorkspaceSession(session)) return sessionFailureResponse(session);

  const allDefinitions = await listConnectorDefinitions(session.organizationId);
  const definitions = allDefinitions.filter(
    (definition) => definition.definitionStatus === "active",
  );

  const resolved = await Promise.all(
    definitions.map(async (definition) => {
      const connection = await resolveConnectorConnection({
        organizationId: session.organizationId,
        slug: definition.slug,
        actingUserId: session.user.id,
      });
      return connection
        ? ({
            slug: definition.slug,
            displayName: definition.displayName,
            icon: definition.icon,
          } satisfies SelectableConnector)
        : null;
    }),
  );

  return Response.json({
    connectors: resolved.filter((connector) => connector !== null),
  });
}
