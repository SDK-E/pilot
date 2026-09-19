"use client";

import { useEffect, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { ByokCredential } from "@/byok/byok-repository";

interface CatalogProvider {
  id: string;
  name: string;
  apiBaseUrl: string | null;
}

interface CatalogModel {
  id: string;
  displayName: string;
}

function useProviderModels(providerId: string) {
  const [models, setModels] = useState<CatalogModel[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      if (!providerId) {
        setModels([]);
        return;
      }
      try {
        const response = await fetch(
          `/api/models-catalog/providers/${providerId}/models`,
          { signal: controller.signal },
        );
        const data = response.ok
          ? ((await response.json()) as { models: CatalogModel[] })
          : { models: [] };
        setModels(data.models);
      } catch {
        setModels([]);
      }
    }
    void load();
    return () => {
      controller.abort();
    };
  }, [providerId]);
  return models;
}

function credentialModelId(catalogModelId: string, providerId: string) {
  return catalogModelId.startsWith(`${providerId}/`)
    ? catalogModelId.slice(providerId.length + 1)
    : catalogModelId;
}

function ModelCheckboxList({
  models,
  providerId,
  credential,
}: {
  models: CatalogModel[];
  providerId: string;
  credential?: ByokCredential;
}) {
  if (models.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        {providerId
          ? "No models synced for this provider yet."
          : "Choose a provider to list its models."}
      </p>
    );
  }
  return (
    <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-md border p-2">
      {models.map((model) => {
        const modelId = credentialModelId(model.id, providerId);
        return (
          <label className="flex items-center gap-2 text-sm" key={model.id}>
            <input
              defaultChecked={credential?.allowedModelIds.includes(modelId)}
              name="allowedModelIds"
              type="checkbox"
              value={modelId}
            />
            {model.displayName}
          </label>
        );
      })}
    </div>
  );
}

function ProviderField({
  providers,
  credential,
  onChange,
}: {
  providers: CatalogProvider[];
  credential?: ByokCredential;
  onChange: (providerId: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor="providerId">Provider</Label>
      <select
        className="border-input flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs"
        defaultValue={credential?.providerId}
        id="providerId"
        name="providerId"
        onChange={(event) => {
          onChange(event.currentTarget.value);
        }}
        required
      >
        <option disabled value="">
          Choose a provider…
        </option>
        {providers.map((provider) => (
          <option key={provider.id} value={provider.id}>
            {provider.name}
          </option>
        ))}
      </select>
      {providers.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No providers synced yet — the models.dev catalog syncs daily.
        </p>
      ) : null}
    </div>
  );
}

function BaseUrlField({
  credential,
  selectedProvider,
}: {
  credential?: ByokCredential;
  selectedProvider?: CatalogProvider;
}) {
  const defaultUrl = credential?.baseUrl ?? selectedProvider?.apiBaseUrl ?? "";
  return (
    <div className="space-y-1.5">
      <Label htmlFor="baseUrl">Base URL</Label>
      <Input
        defaultValue={defaultUrl}
        id="baseUrl"
        key={defaultUrl}
        name="baseUrl"
        placeholder="https://api.example.com/v1"
        required
        type="url"
      />
    </div>
  );
}

function ApiKeyField({ credential }: { credential?: ByokCredential }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor="apiKey">API key</Label>
      <Input
        id="apiKey"
        name="apiKey"
        placeholder={credential ? "Leave blank to keep the current key" : ""}
        required={!credential}
        type="password"
      />
    </div>
  );
}

export function ByokCredentialFields({
  providers,
  credential,
}: {
  providers: CatalogProvider[];
  credential?: ByokCredential;
}) {
  const [providerId, setProviderId] = useState(credential?.providerId ?? "");
  const models = useProviderModels(providerId);
  const selectedProvider = providers.find(
    (provider) => provider.id === providerId,
  );

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="label">Label</Label>
        <Input
          defaultValue={credential?.label}
          id="label"
          maxLength={200}
          name="label"
          placeholder="My Anthropic key"
          required
        />
      </div>
      <ProviderField
        credential={credential}
        onChange={setProviderId}
        providers={providers}
      />
      <BaseUrlField
        credential={credential}
        selectedProvider={selectedProvider}
      />
      <ApiKeyField credential={credential} />
      <div className="space-y-1.5">
        <Label>Models this key may serve</Label>
        <ModelCheckboxList
          credential={credential}
          models={models}
          providerId={providerId}
        />
      </div>
      <input name="enabled" type="hidden" value="true" />
    </div>
  );
}
