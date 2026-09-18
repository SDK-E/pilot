import { inArray } from "drizzle-orm";

import { listByokCredentials } from "@/byok/byok-repository";
import { db } from "@/db/client";
import { catalogModels } from "@/db/schema";
import { listSelectableModels } from "@/model-gateways/model-gateway-repository";
import {
  getWorkspaceSession,
  isWorkspaceSession,
  sessionFailureResponse,
} from "@/organizations/workspace-session";

export const runtime = "nodejs";

interface SelectableModelResponse {
  value: string;
  label: string;
  modelId: string;
  source: "platform" | "byok";
  contextLimit?: number;
  reasoning?: boolean;
  toolCall?: boolean;
}

interface CatalogMetadata {
  contextLimit: number | null;
  reasoning: boolean;
  toolCall: boolean;
}

async function catalogMetadataByCatalogId(
  catalogIds: string[],
): Promise<Map<string, CatalogMetadata>> {
  if (catalogIds.length === 0) return new Map();
  const rows = await db
    .select({
      id: catalogModels.id,
      contextLimit: catalogModels.contextLimit,
      reasoning: catalogModels.reasoning,
      toolCall: catalogModels.toolCall,
    })
    .from(catalogModels)
    .where(inArray(catalogModels.id, catalogIds));
  return new Map(rows.map(({ id, ...metadata }) => [id, metadata]));
}

export async function GET() {
  const session = await getWorkspaceSession();
  if (!isWorkspaceSession(session)) return sessionFailureResponse(session);

  const [platformModels, byokCredentials] = await Promise.all([
    listSelectableModels(),
    listByokCredentials(session.organizationId, session.user.id),
  ]);

  const enabledCredentials = byokCredentials.filter(
    (credential) => credential.enabled,
  );
  const catalogIds = enabledCredentials.flatMap((credential) =>
    credential.allowedModelIds.map(
      (modelId) => `${credential.providerId}/${modelId}`,
    ),
  );
  const metadataByCatalogId = await catalogMetadataByCatalogId(catalogIds);

  const platform: SelectableModelResponse[] = platformModels.map((model) => ({
    value: model.value,
    label: model.gatewayName,
    modelId: model.modelId,
    source: "platform",
  }));

  const byok: SelectableModelResponse[] = enabledCredentials.flatMap(
    (credential) =>
      credential.allowedModelIds.map((modelId) => {
        const metadata = metadataByCatalogId.get(
          `${credential.providerId}/${modelId}`,
        );
        return {
          value: `byok:${credential.id}:${modelId}`,
          label: credential.label,
          modelId,
          source: "byok" as const,
          contextLimit: metadata?.contextLimit ?? undefined,
          reasoning: metadata?.reasoning,
          toolCall: metadata?.toolCall,
        };
      }),
  );

  return Response.json({ platform, byok } satisfies {
    platform: SelectableModelResponse[];
    byok: SelectableModelResponse[];
  });
}
