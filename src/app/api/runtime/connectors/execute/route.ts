import { z } from "zod";

import { isVerifiedPilotRuntimeCallback } from "@/ai/workos-m2m";
import { runGithubAction } from "@/connectors/adapters/github";
import { runGmailAction } from "@/connectors/adapters/gmail";
import { runGoogleDriveAction } from "@/connectors/adapters/google-drive";
import { runLinearAction } from "@/connectors/adapters/linear";
import { runMondayAction } from "@/connectors/adapters/monday";
import { runNotionAction } from "@/connectors/adapters/notion";
import { runSlackAction } from "@/connectors/adapters/slack";
import { runVercelAction } from "@/connectors/adapters/vercel";
import {
  markConnectorConnectionError,
  resolveDefaultConnectorConnection,
  touchConnectorConnectionLastUsed,
  upsertConnectorConnection,
} from "@/connectors/connector-repository";
import {
  connectorProvider,
  isConnectorToolId,
  TOOL_ID_PROVIDER,
  type ConnectorToolId,
} from "@/connectors/connector-providers";
import { getRuntimeConversation } from "@/conversations/scratchpad-repository";
import { readJsonBody } from "@/lib/http";

export const runtime = "nodejs";

const REFRESH_MARGIN_MS = 5 * 60 * 1000;

const inputSchema = z
  .object({
    organizationId: z.string().min(1).max(255),
    executionId: z.uuid(),
    toolId: z.string().min(1).max(100),
    action: z.string().min(1).max(100),
    params: z.record(z.string(), z.unknown()),
  })
  .strict();

type Adapter = (input: {
  accessToken: string;
  action: string;
  params: Record<string, unknown>;
}) => Promise<unknown>;

// Keyed by tool id, not provider id: Gmail and Google Drive share the
// "google" provider (one connection, two tools) but dispatch to different
// adapters.
const ADAPTERS: Record<ConnectorToolId, Adapter> = {
  "connector-github": runGithubAction,
  "connector-google-drive": runGoogleDriveAction,
  "connector-gmail": runGmailAction,
  "connector-slack": runSlackAction,
  "connector-notion": runNotionAction,
  "connector-linear": runLinearAction,
  "connector-vercel": runVercelAction,
  "connector-monday": runMondayAction,
};

/**
 * Dispatches a connector tool call from Pilot AI's runtime. Ownership is
 * derived strictly from `executionId` via the DB, never trusted from the
 * request body (`organizationId` there is only a consistency hint).
 */
export async function POST(request: Request) {
  if (!(await isVerifiedPilotRuntimeCallback(request))) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }
  const parsed = inputSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) {
    return Response.json({ error: "Invalid connector command." }, { status: 400 });
  }
  const input = parsed.data;

  const execution = await getRuntimeConversation({
    organizationId: input.organizationId,
    executionId: input.executionId,
  });
  if (!execution) {
    return Response.json({ error: "Execution unavailable." }, { status: 404 });
  }
  const { organizationId } = input;
  const { userId } = execution;

  if (!isConnectorToolId(input.toolId)) {
    return Response.json({ error: "Unknown connector tool." }, { status: 400 });
  }
  const providerId = TOOL_ID_PROVIDER[input.toolId];

  const connection = await resolveDefaultConnectorConnection({
    organizationId,
    userId,
    providerId,
  });
  if (!connection) {
    return Response.json(
      { error: "No connected account for this tool." },
      { status: 404 },
    );
  }

  let accessToken = connection.accessToken;
  const expiresSoon =
    connection.tokenExpiresAt &&
    connection.tokenExpiresAt.getTime() - Date.now() < REFRESH_MARGIN_MS;
  if (expiresSoon && connection.refreshToken) {
    try {
      const provider = connectorProvider(providerId);
      const refreshed = await provider.refreshAccessToken(connection.refreshToken);
      await upsertConnectorConnection({
        organizationId,
        ownerScope: connection.ownerScope,
        ownerWorkosUserId: connection.ownerScope === "user" ? userId : null,
        providerId,
        accountIdentifier: connection.accountIdentifier,
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken ?? connection.refreshToken,
        tokenExpiresAt: refreshed.expiresAt,
        grantedScopes: refreshed.grantedScopes,
        createdByWorkosUserId: userId,
      });
      accessToken = refreshed.accessToken;
    } catch (error) {
      console.error(`Connector token refresh failed for ${providerId}:`, error);
      await markConnectorConnectionError({
        connectionId: connection.id,
        message: "Token refresh failed.",
      });
      return Response.json(
        { error: "Connection needs to be reconnected." },
        { status: 409 },
      );
    }
  }

  try {
    const result = await ADAPTERS[input.toolId]({
      accessToken,
      action: input.action,
      params: input.params,
    });
    await touchConnectorConnectionLastUsed(connection.id);
    return Response.json({ result });
  } catch (error) {
    console.error(`Connector action failed for ${providerId}/${input.action}:`, error);
    return Response.json(
      { error: "This connector action could not be completed." },
      { status: 502 },
    );
  }
}
