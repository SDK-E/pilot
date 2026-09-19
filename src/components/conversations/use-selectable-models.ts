"use client";

import { useEffect, useState } from "react";

export interface SelectableModel {
  value: string;
  label: string;
  modelId: string;
  source: "platform" | "byok";
  contextLimit?: number;
  reasoning?: boolean;
  toolCall?: boolean;
}

interface SelectableModelsResponse {
  platform: SelectableModel[];
  byok: SelectableModel[];
  usageExhausted: boolean;
}

/**
 * The composer's model picker options — the org's platform gateways plus
 * the signed-in user's own BYOK credentials, fetched once per mount rather
 * than passed down from the server, since a BYOK credential can be
 * added/removed without a full page reload. `usageExhausted` nudges (never
 * blocks) toward picking a BYOK model once the 5-hour or weekly platform
 * allowance set in Settings runs out — see `usage-limit-repository.ts`.
 */
export function useSelectableModels() {
  const [models, setModels] = useState<SelectableModelsResponse>({
    platform: [],
    byok: [],
    usageExhausted: false,
  });

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/models/selectable", {
          signal: controller.signal,
        });
        if (!response.ok) return;
        const data = (await response.json()) as SelectableModelsResponse;
        setModels(data);
      } catch {
        // Keep the composer usable with no model picker options rather
        // than surfacing an error for what is an optional enhancement.
      }
    }
    void load();
    return () => {
      controller.abort();
    };
  }, []);

  return models;
}
