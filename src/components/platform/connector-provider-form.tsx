"use client";

import { useState } from "react";

import {
  createConnectorProviderAction,
  updateConnectorProviderAction,
} from "@/app/admin/connector-providers/actions";
import {
  BasicFields,
  ClientFields,
  OAuthFields,
  ActionsField,
  type ProviderDraft,
  draftFromProvider,
  emptyDraft,
} from "@/components/platform/connector-provider-form-fields";
import { FormSubmitToast } from "@/components/settings/form-submit-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { CONNECTOR_SEEDS } from "@/connectors/connector-seed-definitions";

import type { ConnectorProviderForAdmin } from "@/platform/connector-provider-repository";

function PresetButtons({
  onPick,
}: {
  onPick: (preset: (typeof CONNECTOR_SEEDS)[number]) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>Quick fill from a built-in preset</Label>
      <div className="flex flex-wrap gap-2">
        {CONNECTOR_SEEDS.map((preset) => (
          <Button
            key={preset.slug}
            onClick={() => {
              onPick(preset);
            }}
            size="sm"
            type="button"
            variant="outline"
          >
            <span aria-hidden>{preset.icon}</span> {preset.displayName}
          </Button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Fills every field below except client id/secret, which you still supply.
        You can also ignore every preset and configure a fully custom provider.
      </p>
    </div>
  );
}

function ProviderFormFields({
  draft,
  onChange,
  isEditing,
}: {
  draft: ProviderDraft;
  onChange: (patch: Partial<ProviderDraft>) => void;
  isEditing: boolean;
}) {
  return (
    <div className="space-y-4">
      {isEditing ? null : (
        <PresetButtons
          onPick={(preset) => {
            onChange({
              slug: preset.slug,
              icon: preset.icon,
              displayName: preset.displayName,
              description: preset.description,
              authorizeUrl: preset.authorizeUrl,
              tokenUrl: preset.tokenUrl,
              scopes: preset.scopes.join(" "),
              accountIdentifierUrl: preset.accountIdentifierUrl ?? "",
              accountIdentifierField: preset.accountIdentifierField ?? "",
              actionsJson: JSON.stringify(preset.actions, null, 2),
            });
          }}
        />
      )}
      <BasicFields draft={draft} isEditing={isEditing} onChange={onChange} />
      <OAuthFields draft={draft} onChange={onChange} />
      <ClientFields draft={draft} isEditing={isEditing} onChange={onChange} />
      <ActionsField draft={draft} onChange={onChange} />
    </div>
  );
}

export function CreateConnectorProviderDialog() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ProviderDraft>(emptyDraft());

  return (
    <Dialog
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setDraft(emptyDraft());
      }}
      open={open}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Add provider
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <form action={createConnectorProviderAction}>
          <DialogHeader>
            <DialogTitle>Add a connector provider</DialogTitle>
            <DialogDescription>
              A generic OAuth2 + REST integration every organization can seed
              into its own connectors, configured here instead of shipped as
              code.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <ProviderFormFields
              draft={draft}
              isEditing={false}
              onChange={(patch) => {
                setDraft((current) => ({ ...current, ...patch }));
              }}
            />
          </div>
          <DialogFooter>
            <Button type="submit">Create provider</Button>
            <FormSubmitToast message="Connector provider created" />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EditConnectorProviderDialog({
  provider,
}: {
  provider: ConnectorProviderForAdmin;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ProviderDraft>(() =>
    draftFromProvider(provider),
  );

  return (
    <Dialog
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setDraft(draftFromProvider(provider));
      }}
      open={open}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <form action={updateConnectorProviderAction}>
          <input name="id" type="hidden" value={provider.id} />
          <DialogHeader>
            <DialogTitle>Edit {provider.displayName}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <ProviderFormFields
              draft={draft}
              isEditing
              onChange={(patch) => {
                setDraft((current) => ({ ...current, ...patch }));
              }}
            />
          </div>
          <DialogFooter>
            <Button type="submit">Save changes</Button>
            <FormSubmitToast message="Connector provider updated" />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
