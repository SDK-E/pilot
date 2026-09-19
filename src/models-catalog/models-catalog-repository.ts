import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { catalogModels, catalogProviders } from "@/db/schema";

export function listCatalogProviders() {
  return db
    .select({
      id: catalogProviders.id,
      name: catalogProviders.name,
      apiBaseUrl: catalogProviders.apiBaseUrl,
    })
    .from(catalogProviders)
    .orderBy(catalogProviders.name);
}

export function listCatalogModelsForProvider(providerId: string) {
  return db
    .select({
      id: catalogModels.id,
      displayName: catalogModels.displayName,
    })
    .from(catalogModels)
    .where(eq(catalogModels.providerId, providerId))
    .orderBy(catalogModels.displayName);
}
