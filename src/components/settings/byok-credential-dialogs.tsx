"use client";

import { useState } from "react";

import {
  createByokCredentialAction,
  updateByokCredentialAction,
} from "@/app/(workspace)/settings/byok-actions";
import { ByokCredentialFields } from "@/components/settings/byok-credential-form";
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

import type { ByokCredential } from "@/byok/byok-repository";

interface CatalogProvider {
  id: string;
  name: string;
  apiBaseUrl: string | null;
}

export function CreateByokCredentialDialog({
  providers,
}: {
  providers: CatalogProvider[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Add a key
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <form
          action={async (formData) => {
            await createByokCredentialAction(formData);
            setOpen(false);
          }}
        >
          <DialogHeader>
            <DialogTitle>Add your own API key</DialogTitle>
            <DialogDescription>
              Used when you pick it from the composer, or automatically once
              your platform usage allowance is exhausted.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <ByokCredentialFields providers={providers} />
          </div>
          <DialogFooter>
            <Button type="submit">Add key</Button>
          </DialogFooter>
          <FormSubmitToast message="Key added" />
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EditByokCredentialDialog({
  providers,
  credential,
}: {
  providers: CatalogProvider[];
  credential: ByokCredential;
}) {
  const [open, setOpen] = useState(false);
  const action = updateByokCredentialAction.bind(null, credential.id);
  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <form
          action={async (formData) => {
            await action(formData);
            setOpen(false);
          }}
        >
          <DialogHeader>
            <DialogTitle>Edit {credential.label}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <ByokCredentialFields
              credential={credential}
              providers={providers}
            />
          </div>
          <DialogFooter>
            <Button type="submit">Save changes</Button>
          </DialogFooter>
          <FormSubmitToast message="Key updated" />
        </form>
      </DialogContent>
    </Dialog>
  );
}
