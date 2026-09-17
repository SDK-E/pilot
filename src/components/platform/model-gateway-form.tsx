"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import {
  createModelGatewayAction,
  updateModelGatewayAction,
  type GatewayFormState,
} from "@/app/admin/model-gateways/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import type { ModelGateway } from "@/model-gateways/model-gateway-repository";

const initialState: GatewayFormState = { status: "idle" };

const PRESETS = [
  {
    label: "Kilo Gateway",
    baseUrl: "https://api.kilo.ai/api/gateway",
    suggestedModels: "kilo-auto/free, kilo-auto/balanced, kilo-auto/frontier",
  },
  {
    label: "Vercel AI Gateway",
    baseUrl: "https://ai-gateway.vercel.sh/v1",
    suggestedModels: "openai/gpt-4o, anthropic/claude-sonnet-4",
  },
];

function submitLabel(isPending: boolean, isEditing: boolean): string {
  if (isPending) return "Saving…";
  return isEditing ? "Save gateway" : "Create gateway";
}

function PresetButtons({ onPick }: { onPick: (baseUrl: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {PRESETS.map((preset) => (
        <Button
          key={preset.label}
          onClick={() => {
            onPick(preset.baseUrl);
          }}
          size="sm"
          type="button"
          variant="outline"
        >
          {preset.label}
        </Button>
      ))}
    </div>
  );
}

function GatewayFields({
  gateway,
  baseUrl,
  onBaseUrlChange,
}: {
  gateway?: ModelGateway;
  baseUrl: string;
  onBaseUrlChange: (value: string) => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="gateway-name">Name</Label>
        <Input
          defaultValue={gateway?.name}
          id="gateway-name"
          maxLength={100}
          name="name"
          placeholder="e.g. Kilo Gateway (production)"
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Base URL</Label>
        <PresetButtons onPick={onBaseUrlChange} />
        <Input
          id="gateway-base-url"
          name="baseUrl"
          onChange={(event) => {
            onBaseUrlChange(event.currentTarget.value);
          }}
          placeholder="https://api.example.com/v1"
          required
          type="url"
          value={baseUrl}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="gateway-api-key">
          API key{gateway ? " (leave blank to keep the current one)" : ""}
        </Label>
        <Input
          autoComplete="off"
          id="gateway-api-key"
          name="apiKey"
          placeholder={gateway ? "••••••••••••" : "Paste the API key"}
          required={!gateway}
          type="password"
        />
        <p className="text-xs text-muted-foreground">
          Stored encrypted (AES-256-GCM) and only ever decrypted server-side for
          one request to this gateway.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="gateway-models">Allowed model ids</Label>
        <Textarea
          className="min-h-20 font-mono text-sm"
          defaultValue={gateway?.allowedModelIds.join(", ")}
          id="gateway-models"
          name="allowedModelIds"
          required
        />
        <p className="text-xs text-muted-foreground">
          Comma-separated. These are the only models an organization can select
          for this gateway — curate the catalog rather than exposing every model
          the provider offers.
        </p>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border p-3">
        <div>
          <p className="text-sm font-medium">Enabled</p>
          <p className="text-xs text-muted-foreground">
            Organizations can only select models from an enabled gateway.
          </p>
        </div>
        <Switch
          defaultChecked={gateway?.enabled ?? true}
          name="enabled"
          value="true"
        />
      </div>
    </>
  );
}

export function ModelGatewayForm({ gateway }: { gateway?: ModelGateway }) {
  const router = useRouter();
  const [baseUrl, setBaseUrl] = useState(gateway?.baseUrl ?? "");
  const [state, action, isPending] = useActionState(
    gateway ? updateModelGatewayAction : createModelGatewayAction,
    initialState,
  );
  useEffect(() => {
    if (state.status === "success" && state.href) router.push(state.href);
  }, [router, state.href, state.status]);

  return (
    <form action={action} className="space-y-6">
      {gateway ? (
        <input name="gatewayId" type="hidden" value={gateway.id} />
      ) : null}
      <GatewayFields
        baseUrl={baseUrl}
        gateway={gateway}
        onBaseUrlChange={setBaseUrl}
      />
      {state.message ? (
        <p
          aria-live="polite"
          className={
            state.status === "error"
              ? "text-sm text-destructive"
              : "text-sm text-primary"
          }
        >
          {state.message}
        </p>
      ) : null}
      <Button disabled={isPending} type="submit">
        {submitLabel(isPending, Boolean(gateway))}
      </Button>
    </form>
  );
}
