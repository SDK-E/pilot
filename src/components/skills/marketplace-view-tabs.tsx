"use client";

import { cn } from "cn";

import type { MarketplaceView } from "@/app/(workspace)/skills/marketplace/actions";

const VIEWS: { value: MarketplaceView; label: string }[] = [
  { value: "trending", label: "Trending" },
  { value: "all-time", label: "All time" },
  { value: "hot", label: "Hot" },
  { value: "official", label: "Official" },
];

export function MarketplaceViewTabs({
  value,
  onChange,
}: {
  value: MarketplaceView;
  onChange: (view: MarketplaceView) => void;
}) {
  return (
    <div
      aria-label="Filter skills"
      className="inline-flex gap-1 rounded-lg border bg-muted/40 p-1"
      role="tablist"
    >
      {VIEWS.map((tab) => (
        <button
          aria-selected={value === tab.value}
          className={cn(
            "rounded-md px-3 py-1 text-xs font-medium transition-colors",
            value === tab.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
          key={tab.value}
          onClick={() => {
            onChange(tab.value);
          }}
          role="tab"
          type="button"
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
