import { updateUsageLimitPolicyAction } from "@/app/(workspace)/settings/actions";
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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

/**
 * Rolling 5-hour and weekly token allowances per member, mirroring
 * Anthropic's own Claude usage UX. Leaving either blank means unlimited —
 * never a hardcoded constant. Once a member exceeds one of these, their own
 * BYOK key (if they have an enabled one) substitutes automatically for the
 * org's primary model — see `model-plan.ts` and `usage-limit-repository.ts`.
 */
export function UsageLimitSection({
  fiveHourTokenLimit,
  weeklyTokenLimit,
}: {
  fiveHourTokenLimit: number | null;
  weeklyTokenLimit: number | null;
}) {
  return (
    <Card>
      <form action={updateUsageLimitPolicyAction}>
        <CardHeader>
          <CardTitle>Usage limits</CardTitle>
          <CardDescription>
            Cap each member&apos;s platform-model usage over a rolling 5-hour
            and weekly window. Leave a field blank for unlimited.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <FieldGroup className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="fiveHourTokenLimit">
                5-hour token limit
              </FieldLabel>
              <Input
                defaultValue={fiveHourTokenLimit ?? ""}
                id="fiveHourTokenLimit"
                key={fiveHourTokenLimit}
                min={1}
                name="fiveHourTokenLimit"
                placeholder="Unlimited"
                type="number"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="weeklyTokenLimit">
                Weekly token limit
              </FieldLabel>
              <Input
                defaultValue={weeklyTokenLimit ?? ""}
                id="weeklyTokenLimit"
                key={weeklyTokenLimit}
                min={1}
                name="weeklyTokenLimit"
                placeholder="Unlimited"
                type="number"
              />
            </Field>
          </FieldGroup>
        </CardContent>
        <CardFooter className="pt-4">
          <Button type="submit" variant="outline">
            Save usage limits
          </Button>
          <FormSubmitToast message="Usage limits saved" />
        </CardFooter>
      </form>
    </Card>
  );
}
