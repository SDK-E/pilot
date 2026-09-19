import { updateOrganizationStandingInstructionsAction } from "@/app/(workspace)/settings/memory-actions";
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
import { Textarea } from "@/components/ui/textarea";

/**
 * The broadest instruction tier: applies to every conversation for every
 * member of the organization, above a member's own general instructions.
 */
export function OrganizationInstructionsSection({
  standingInstructions,
}: {
  standingInstructions: string | null;
}) {
  return (
    <Card>
      <form action={updateOrganizationStandingInstructionsAction}>
        <CardHeader>
          <CardTitle>Organization standing instructions</CardTitle>
          <CardDescription>
            Apply to every conversation, for every member of this organization,
            in Chat, Work, and Code alike.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <Textarea
            aria-label="Organization standing instructions"
            className="min-h-32"
            defaultValue={standingInstructions ?? ""}
            key={standingInstructions}
            maxLength={4000}
            name="standingInstructions"
            placeholder="e.g. Always answer in French. Never share customer names outside this workspace."
          />
        </CardContent>
        <CardFooter className="pt-4">
          <Button type="submit" variant="outline">
            Save organization instructions
          </Button>
          <FormSubmitToast message="Organization instructions saved" />
        </CardFooter>
      </form>
    </Card>
  );
}
