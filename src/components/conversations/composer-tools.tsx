"use client";

import {
  PromptInputActionAddAttachments,
  PromptInputActionAddScreenshot,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { ConnectorToggleMenu } from "@/components/conversations/connector-toggle-menu";
import { ModelPicker } from "@/components/conversations/model-picker";
import { SkillPicker } from "@/components/conversations/skill-picker";

import type { ComposerSkill } from "@/components/conversations/skill-picker";
import type { SelectableConnector } from "@/components/conversations/use-selectable-connectors";
import type { SelectableModel } from "@/components/conversations/use-selectable-models";

interface ComposerConnectorProps {
  hasConnector: boolean;
  connectors: SelectableConnector[];
  connectorToolIds: string[] | undefined;
  onConnectorToolIdsChange: (next: string[] | undefined) => void;
  connectorSlugs: string[] | undefined;
  onConnectorSlugsChange: (next: string[] | undefined) => void;
}

interface ComposerToolsProps extends ComposerConnectorProps {
  isBusy: boolean;
  agentId: string;
  skills: ComposerSkill[];
  skillIds: string[];
  onSkillIdsChange: (next: string[]) => void;
  selectableModels: {
    platform: SelectableModel[];
    byok: SelectableModel[];
    usageExhausted: boolean;
  };
  requestedModelId: string | undefined;
  onRequestedModelIdChange: (next: string | undefined) => void;
  agentName: string;
}

export function ComposerTools({
  isBusy,
  hasConnector,
  connectors,
  connectorToolIds,
  onConnectorToolIdsChange,
  connectorSlugs,
  onConnectorSlugsChange,
  agentId,
  skills,
  skillIds,
  onSkillIdsChange,
  selectableModels,
  requestedModelId,
  onRequestedModelIdChange,
  agentName,
}: ComposerToolsProps) {
  return (
    <PromptInputTools>
      <PromptInputActionMenu>
        <PromptInputActionMenuTrigger disabled={isBusy} tooltip="Add files" />
        <PromptInputActionMenuContent>
          <PromptInputActionAddAttachments label="Add files" />
          <PromptInputActionAddScreenshot label="Add screenshot" />
        </PromptInputActionMenuContent>
      </PromptInputActionMenu>
      <ConnectorToggleMenu
        connectors={connectors}
        disabled={isBusy}
        hasConnector={hasConnector}
        onChange={onConnectorToolIdsChange}
        onSlugsChange={onConnectorSlugsChange}
        selected={connectorToolIds}
        selectedSlugs={connectorSlugs}
      />
      <SkillPicker
        agentId={agentId}
        disabled={isBusy}
        onChange={onSkillIdsChange}
        selected={skillIds}
        skills={skills}
      />
      <ModelPicker
        disabled={isBusy}
        models={selectableModels}
        onChange={onRequestedModelIdChange}
        selected={requestedModelId}
      />
      <span className="px-1 text-xs text-muted-foreground">{agentName}</span>
    </PromptInputTools>
  );
}
