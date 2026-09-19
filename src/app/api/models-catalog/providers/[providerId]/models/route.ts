import { listCatalogModelsForProvider } from "@/models-catalog/models-catalog-repository";
import {
  getWorkspaceSession,
  isWorkspaceSession,
  sessionFailureResponse,
} from "@/organizations/workspace-session";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ providerId: string }> },
) {
  const session = await getWorkspaceSession();
  if (!isWorkspaceSession(session)) return sessionFailureResponse(session);
  const { providerId } = await params;
  const models = await listCatalogModelsForProvider(providerId);
  return Response.json({ models });
}
