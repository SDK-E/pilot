"use client";

import { useEffect, useState } from "react";

export interface SelectableConnector {
  slug: string;
  displayName: string;
  icon: string | null;
}

/**
 * The composer's per-connector picker options — every connector the
 * signed-in user can actually use right now, fetched once per mount since a
 * connection can be added/removed without a full page reload.
 */
export function useSelectableConnectors() {
  const [connectors, setConnectors] = useState<SelectableConnector[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/connectors/selectable", {
          signal: controller.signal,
        });
        if (!response.ok) return;
        const data = (await response.json()) as {
          connectors: SelectableConnector[];
        };
        setConnectors(data.connectors);
      } catch {
        // Keep the composer usable with no connector picker options rather
        // than surfacing an error for what is an optional enhancement.
      }
    }
    void load();
    return () => {
      controller.abort();
    };
  }, []);

  return connectors;
}
