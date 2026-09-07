"use client";

import * as React from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

const themes = [
  { id: "system", label: "System", icon: Monitor },
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
] as const;

export function ThemeSwitcher() {
  const { setTheme, theme } = useTheme();
  const isHydrated = React.useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  return (
    <div
      aria-label="Color theme"
      className="inline-flex items-center rounded-2xl border border-border bg-card p-0.5 shadow-sm"
      role="group"
    >
      {themes.map(({ id, label, icon: Icon }) => {
        const isSelected = isHydrated && theme === id;

        return (
          <Button
            aria-label={`${label} theme`}
            aria-pressed={isSelected}
            className="rounded-xl"
            key={id}
            onClick={() => setTheme(id)}
            size="icon-xs"
            type="button"
            variant={isSelected ? "secondary" : "ghost"}
          >
            <Icon aria-hidden="true" />
            <span className="sr-only">{label}</span>
          </Button>
        );
      })}
    </div>
  );
}
