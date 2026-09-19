"use client";

import { RiCheckLine, RiPlugLine } from "@remixicon/react";

import { PromptInputButton } from "@/components/ai-elements/prompt-input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { SelectableConnector } from "@/components/conversations/use-selectable-connectors";

const CONNECTOR_TOOL_ID = "connector";

interface ConnectorToggleMenuProps {
  hasConnector: boolean;
  connectors: SelectableConnector[];
  /**
   * `undefined` means the connector tool is on (the default); `[]` means
   * the user turned it off for this message only.
   */
  selected: string[] | undefined;
  onChange: (next: string[] | undefined) => void;
  /**
   * Which connector *slugs* are on for this message. `undefined` means
   * every connector the user can use stays available.
   */
  selectedSlugs: string[] | undefined;
  onSlugsChange: (next: string[] | undefined) => void;
  disabled?: boolean;
}

function ConnectorSlugItem({
  connector,
  isSelected,
  onSelect,
}: {
  connector: SelectableConnector;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <DropdownMenuItem
      onSelect={(event) => {
        event.preventDefault();
        onSelect();
      }}
    >
      <span aria-hidden className="text-sm">
        {connector.icon?.trim() ? connector.icon : "🧩"}
      </span>
      <span className="flex-1 truncate">{connector.displayName}</span>
      {isSelected ? (
        <RiCheckLine aria-hidden="true" className="size-4" />
      ) : null}
    </DropdownMenuItem>
  );
}

/**
 * Per-message connector picker: a master on/off (the connector tool is on
 * by default whenever the user has at least one connected connector — a
 * connection's existence is itself the enablement signal, see AGENTS.md)
 * plus, once on, a multi-select of which individual connectors this
 * message may use. Threaded through as `requestedConnectorToolIds` (the
 * master) and `requestedConnectorSlugs` (the subset) — see
 * `tool-authorization.ts` and `dispatch-custom-connector.ts`.
 */
export function ConnectorToggleMenu({
  hasConnector,
  connectors,
  selected,
  onChange,
  selectedSlugs,
  onSlugsChange,
  disabled,
}: ConnectorToggleMenuProps) {
  if (!hasConnector) return null;
  const isOn = selected === undefined || selected.includes(CONNECTOR_TOOL_ID);

  function toggleSlug(slug: string) {
    const current = selectedSlugs ?? connectors.map((c) => c.slug);
    const next = current.includes(slug)
      ? current.filter((value) => value !== slug)
      : [...current, slug];
    onSlugsChange(next.length === connectors.length ? undefined : next);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <PromptInputButton
          aria-pressed={isOn}
          disabled={disabled}
          tooltip={
            isOn
              ? "Connectors on for this message"
              : "Connectors off for this message"
          }
          variant={isOn ? "default" : "outline"}
        >
          <RiPlugLine className="size-4" />
        </PromptInputButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            onChange(isOn ? [] : undefined);
          }}
        >
          <span className="flex-1 truncate">
            {isOn ? "Turn connectors off" : "Turn connectors on"}
          </span>
        </DropdownMenuItem>
        {isOn && connectors.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Connectors for this message</DropdownMenuLabel>
            {connectors.map((connector) => (
              <ConnectorSlugItem
                connector={connector}
                isSelected={
                  selectedSlugs === undefined ||
                  selectedSlugs.includes(connector.slug)
                }
                key={connector.slug}
                onSelect={() => {
                  toggleSlug(connector.slug);
                }}
              />
            ))}
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
