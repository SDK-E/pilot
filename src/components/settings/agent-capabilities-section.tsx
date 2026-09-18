import { updateOrganizationCapabilitiesAction } from "@/app/(workspace)/settings/actions";
import { FormSubmitToast } from "@/components/settings/form-submit-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldTitle,
} from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";

export function AgentCapabilitiesSection({
  webSearchEnabled,
  codeSandboxEnabled,
}: {
  webSearchEnabled: boolean;
  codeSandboxEnabled: boolean;
}) {
  return (
    <Card>
      <form action={updateOrganizationCapabilitiesAction}>
        <CardHeader>
          <CardTitle>Agent capabilities</CardTitle>
          <CardDescription>
            Turn these on or off for every agent in this organization, no deploy
            required.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <FieldGroup>
            <Field orientation="horizontal">
              <FieldContent>
                <FieldTitle>Web search</FieldTitle>
                <FieldDescription>
                  Let agents search and read public web pages.
                </FieldDescription>
              </FieldContent>
              <Switch
                aria-label="Web search"
                defaultChecked={webSearchEnabled}
                key={String(webSearchEnabled)}
                name="webSearchEnabled"
                value="true"
              />
            </Field>
            <Field orientation="horizontal">
              <FieldContent>
                <FieldTitle>Code sandbox</FieldTitle>
                <FieldDescription>
                  Let agents run shell commands in an isolated, billed sandbox.
                </FieldDescription>
              </FieldContent>
              <Switch
                aria-label="Code sandbox"
                defaultChecked={codeSandboxEnabled}
                key={String(codeSandboxEnabled)}
                name="codeSandboxEnabled"
                value="true"
              />
            </Field>
          </FieldGroup>
        </CardContent>
        <CardFooter className="pt-4">
          <Button type="submit" variant="outline">
            Save agent capabilities
          </Button>
          <FormSubmitToast message="Agent capabilities saved" />
        </CardFooter>
      </form>
    </Card>
  );
}
