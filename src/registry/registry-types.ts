export type RegistryStatus = "active" | "inactive" | "degraded" | "deleted";

export interface ProviderDefinition {
  id: string;
  organizationId: string;
  providerKey: string;
  adapterKey: string;
  status: RegistryStatus;
  connectionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ModelDefinition {
  id: string;
  organizationId: string;
  modelId: string;
  providerId: string;
  adapterKey: string;
  providerModelId: string;
  modalities: string[];
  contextWindow: number | null;
  outputLimits: {
    maxTokens: number | null;
    maxCompletionTokens: number | null;
  };
  structuredOutput: boolean;
  toolCalling: boolean;
  streaming: boolean;
  locales: string[];
  region: string | null;
  status: RegistryStatus;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export type CapabilityType = "tool" | "skill" | "agent";

export interface CapabilityDefinition {
  id: string;
  organizationId: string;
  capabilityId: string;
  type: CapabilityType;
  schemaVersion: number;
  requiredScopes: string[];
  riskClass: "low" | "medium" | "high" | "critical";
  availability: "available" | "planned" | "deprecated";
  lifecycle: "stable" | "beta" | "experimental";
  labelKey: string | null;
  labelText: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApprovedSnapshot {
  id: string;
  organizationId: string;
  actorId: string;
  modelId: string;
  providerId: string;
  modelVersion: number;
  contextWindow: number | null;
  toolIds: string[];
  locale: string | null;
  region: string | null;
  version: number;
  approvedAt: Date;
  expiresAt: Date | null;
}

export interface CreateProviderInput {
  organizationId: string;
  providerKey: string;
  adapterKey: string;
  connectionId: string | null;
}

export interface CreateModelInput {
  organizationId: string;
  modelId: string;
  providerId: string;
  adapterKey: string;
  providerModelId: string;
  modalities: string[];
  contextWindow: number | null;
  structuredOutput: boolean;
  toolCalling: boolean;
  streaming: boolean;
  locales: string[];
  region: string | null;
  version: number;
}

export interface CreateCapabilityInput {
  organizationId: string;
  capabilityId: string;
  type: CapabilityType;
  schemaVersion: number;
  requiredScopes: string[];
  riskClass: CapabilityDefinition["riskClass"];
  availability: CapabilityDefinition["availability"];
  lifecycle: CapabilityDefinition["lifecycle"];
  labelKey: string | null;
  labelText: string | null;
}
