"use client";

import { RiComputerLine, RiMoonLine, RiSunLine } from "@remixicon/react";
import { useTheme } from "next-themes";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const THEMES = [
  { id: "light", label: "Light", icon: RiSunLine },
  { id: "dark", label: "Dark", icon: RiMoonLine },
  { id: "system", label: "System", icon: RiComputerLine },
] as const;

// Hydration never changes after the first client render, so there is
// nothing to subscribe to; the store only distinguishes server from client.
function subscribeToNothing() {
  return unsubscribeFromNothing;
}

function unsubscribeFromNothing() {
  // Nothing was subscribed, so there is nothing to release.
}

/**
 * The standard shadcn mode toggle: sun/moon in the trigger, three choices
 * in the menu.
 */
export function ThemeSwitcher() {
  const { setTheme, theme } = useTheme();
  const isHydrated = React.useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
  const current = isHydrated ? (theme ?? "system") : "system";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button aria-label="Change theme" size="icon" variant="ghost">
          <RiSunLine
            aria-hidden="true"
            className="scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90"
          />
          <RiMoonLine
            aria-hidden="true"
            className="absolute scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup onValueChange={setTheme} value={current}>
          {THEMES.map(({ id, label, icon: Icon }) => (
            <DropdownMenuRadioItem key={id} value={id}>
              <Icon aria-hidden="true" />
              {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
