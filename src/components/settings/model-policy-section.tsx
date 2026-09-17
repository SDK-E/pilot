import { updateModelPolicyAction } from "@/app/(workspace)/settings/actions";
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
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export function ModelPolicySection({
  primaryModelId,
  retryEnabled,
  availableModels,
}: {
  primaryModelId: string;
  retryEnabled: boolean;
  availableModels: { value: string; gatewayName: string; modelId: string }[];
}) {
  return (
    <Card>
      <form action={updateModelPolicyAction}>
        <CardHeader>
          <CardTitle>Model policy</CardTitle>
          <CardDescription>
            The primary model this organization uses. Pilot can retry a failed
            reply once with its built-in fallback model.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <FieldGroup>
            {availableModels.length > 0 ? (
              <Field>
                <FieldLabel htmlFor="primary-model">Primary model</FieldLabel>
                <Select defaultValue={primaryModelId} name="primaryModelId">
                  <SelectTrigger className="w-80" id="primary-model">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableModels.map((model) => (
                      <SelectItem key={model.value} value={model.value}>
                        {model.gatewayName} · {model.modelId}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            ) : (
              <p className="text-xs text-muted-foreground">
                No model gateways are configured yet — ask a platform admin to
                add one in the admin panel.
              </p>
            )}
            <Field orientation="horizontal">
              <FieldContent>
                <FieldTitle>Retry once with the fallback model</FieldTitle>
                <FieldDescription>
                  When the primary model fails, send the message again through
                  Pilot&apos;s built-in fallback before reporting an error.
                </FieldDescription>
              </FieldContent>
              <Switch
                aria-label="Retry once with the fallback model"
                defaultChecked={retryEnabled}
                name="retryEnabled"
                value="true"
              />
            </Field>
          </FieldGroup>
        </CardContent>
        <CardFooter className="pt-4">
          <Button
            disabled={availableModels.length === 0}
            type="submit"
            variant="outline"
          >
            Save model policy
          </Button>
          <FormSubmitToast message="Model policy saved" />
        </CardFooter>
      </form>
    </Card>
  );
}
