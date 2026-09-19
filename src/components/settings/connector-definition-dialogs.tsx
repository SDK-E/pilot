import {
  createCustomConnectorAction,
  updateCustomConnectorAction,
} from "@/app/(workspace)/settings/connector-actions";
import { DefinitionFormFields } from "@/components/settings/connector-definition-form";
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

import type { ConnectorDefinitionForSettings } from "@/connectors/connector-definition-repository";

export function CreateCustomConnectorDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Add custom connector
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <form action={createCustomConnectorAction}>
          <DialogHeader>
            <DialogTitle>Add a custom connector</DialogTitle>
            <DialogDescription>
              A generic OAuth2 + REST integration your agents can call,
              configured here instead of shipped as code.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <DefinitionFormFields />
          </div>
          <DialogFooter>
            <Button type="submit">Create connector</Button>
            <FormSubmitToast message="Custom connector created" />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EditCustomConnectorDialog({
  definition,
}: {
  definition: ConnectorDefinitionForSettings;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <form action={updateCustomConnectorAction}>
          <input name="id" type="hidden" value={definition.id} />
          <DialogHeader>
            <DialogTitle>Edit {definition.displayName}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <DefinitionFormFields definition={definition} />
          </div>
          <DialogFooter>
            <Button type="submit">Save changes</Button>
            <FormSubmitToast message="Custom connector updated" />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
