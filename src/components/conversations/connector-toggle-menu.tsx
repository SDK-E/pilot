"use client";

import { RiPlugLine } from "@remixicon/react";

import { PromptInputButton } from "@/components/ai-elements/prompt-input";

const CONNECTOR_TOOL_ID = "connector";

interface ConnectorToggleMenuProps {
  hasConnector: boolean;
  /**
   * `undefined` means the connector tool is on (the default); `[]` means
   * the user turned it off for this message only.
   */
  selected: string[] | undefined;
  onChange: (next: string[] | undefined) => void;
  disabled?: boolean;
}

/**
 * Per-message connector toggle: the connector tool is on by default
 * whenever the org has at least one connected connector (a connection's
 * existence is itself the enablement signal, see AGENTS.md), and this
 * button lets the user turn it off for just this message.
 */
export function ConnectorToggleMenu({
  hasConnector,
  selected,
  onChange,
  disabled,
}: ConnectorToggleMenuProps) {
  if (!hasConnector) return null;
  const isOn = selected === undefined || selected.includes(CONNECTOR_TOOL_ID);

  return (
    <PromptInputButton
      aria-pressed={isOn}
      disabled={disabled}
      onClick={() => {
        onChange(isOn ? [] : [CONNECTOR_TOOL_ID]);
      }}
      tooltip={
        isOn
          ? "Connectors on for this message"
          : "Connectors off for this message"
      }
      variant={isOn ? "default" : "outline"}
    >
      <RiPlugLine className="size-4" />
    </PromptInputButton>
  );
}
