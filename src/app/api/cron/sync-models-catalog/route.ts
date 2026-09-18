import { isVerifiedCronRequest } from "@/lib/cron-auth";

/**
 * Daily refresh of the models.dev provider/model catalog (`catalog_providers`/
 * `catalog_models`), triggered by the same external HTTP cron scheduler as
 * every other `/api/cron/*` route. Daily is enough — unlike the per-minute
 * continuation sweep, nothing here is latency-sensitive. See
 * `isVerifiedCronRequest` for this route's authentication and
 * `src/models-catalog/sync-models-catalog.ts` for the sync itself.
 */
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!(await isVerifiedCronRequest(request))) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { syncModelsCatalog } = await import(
    "@/models-catalog/sync-models-catalog"
  );
  const result = await syncModelsCatalog();

  return Response.json(result);
}
