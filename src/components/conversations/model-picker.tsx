"use client";

import { RiCheckLine, RiCpuLine } from "@remixicon/react";

import { PromptInputButton } from "@/components/ai-elements/prompt-input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { SelectableModel } from "@/components/conversations/use-selectable-models";

interface ModelPickerProps {
  models: {
    platform: SelectableModel[];
    byok: SelectableModel[];
    usageExhausted: boolean;
  };
  selected: string | undefined;
  onChange: (next: string | undefined) => void;
  disabled?: boolean;
}

function ModelItem({
  model,
  isSelected,
  onSelect,
}: {
  model: SelectableModel;
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
      <span className="flex-1 truncate">{model.modelId}</span>
      {isSelected ? (
        <RiCheckLine aria-hidden="true" className="size-4" />
      ) : null}
    </DropdownMenuItem>
  );
}

/**
 * Per-message model pick: the org's platform gateways plus the user's own
 * BYOK credentials. Selecting "Use the organization's default" (the
 * default state) omits `requestedModelId` entirely, falling back to
 * today's org-preference behavior — see `resolveModelPlan`.
 */
export function ModelPicker({
  models,
  selected,
  onChange,
  disabled,
}: ModelPickerProps) {
  if (models.platform.length === 0 && models.byok.length === 0) return null;
  const selectedModel = [...models.platform, ...models.byok].find(
    (model) => model.value === selected,
  );
  const isUsageExhaustedNudge = !selectedModel && models.usageExhausted;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <PromptInputButton
          disabled={disabled}
          tooltip={
            isUsageExhaustedNudge
              ? "Your platform usage allowance is exhausted — pick one of your own keys"
              : "Model"
          }
        >
          <RiCpuLine className="size-4" />
          {selectedModel ? (
            <span className="max-w-32 truncate text-xs">
              {selectedModel.modelId}
            </span>
          ) : null}
          {isUsageExhaustedNudge ? (
            <span className="size-1.5 rounded-full bg-amber-500" />
          ) : null}
        </PromptInputButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            onChange(undefined);
          }}
        >
          <span className="flex-1 truncate">
            Use the organization&apos;s default
          </span>
          {selected === undefined ? (
            <RiCheckLine aria-hidden="true" className="size-4" />
          ) : null}
        </DropdownMenuItem>
        {models.platform.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Platform</DropdownMenuLabel>
            {models.platform.map((model) => (
              <ModelItem
                isSelected={selected === model.value}
                key={model.value}
                model={model}
                onSelect={() => {
                  onChange(model.value);
                }}
              />
            ))}
          </>
        ) : null}
        {models.byok.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>My keys</DropdownMenuLabel>
            {models.byok.map((model) => (
              <ModelItem
                isSelected={selected === model.value}
                key={model.value}
                model={model}
                onSelect={() => {
                  onChange(model.value);
                }}
              />
            ))}
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
