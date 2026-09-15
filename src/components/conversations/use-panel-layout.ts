"use client";

import { useEffect, useRef, useState } from "react";

import { savePanelLayoutAction } from "@/app/(workspace)/[mode]/[conversationId]/actions";
import { useMediaQuery } from "@/hooks/use-mobile";

import type { PanelLayout } from "./conversation-types";

const STORAGE_KEY = "pilot:conversation-panels:v1";
const DEFAULT_LAYOUT: PanelLayout = { conversation: 72, details: 28 };
const SAVE_DEBOUNCE_MS = 600;

function isPanelLayout(value: unknown): value is PanelLayout {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as PanelLayout).conversation === "number" &&
    typeof (value as PanelLayout).details === "number"
  );
}

function readLocalLayout(): PanelLayout | undefined {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const value: unknown = saved ? JSON.parse(saved) : undefined;
    return isPanelLayout(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The split between transcript and details rail. The server-saved layout
 * wins; otherwise the browser's last layout; otherwise the default. Changes
 * are saved locally at once and to the account after a short pause.
 */
export function usePanelLayout(initial?: PanelLayout) {
  const [layout, setLayout] = useState<PanelLayout>(initial ?? DEFAULT_LAYOUT);
  // Shares the sidebar's own 768px breakpoint (via useMediaQuery) so the
  // sidebar's mobile/desktop split and this panel's split flip together,
  // instead of desyncing across two independently-chosen thresholds.
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const local = initial ? undefined : readLocalLayout();
    const frame = local
      ? requestAnimationFrame(() => {
          setLayout(local);
        })
      : undefined;
    return () => {
      if (frame) cancelAnimationFrame(frame);
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [initial]);

  const onLayoutChanged = (next: Partial<Record<string, number>>) => {
    const value = {
      conversation: next.conversation ?? DEFAULT_LAYOUT.conversation,
      details: next.details ?? DEFAULT_LAYOUT.details,
    };
    setLayout(value);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch {
      // A blocked storage API only loses the local convenience.
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void savePanelLayoutAction(value);
    }, SAVE_DEBOUNCE_MS);
  };

  return { layout, isDesktop, onLayoutChanged };
}
