import { updateGeneralInstructionsAction } from "@/app/(workspace)/settings/memory-actions";
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
 * Unlike `WorkInstructionsSection`, these reach every agent kind — Chat,
 * Work, and Code alike.
 */
export function GeneralInstructionsSection({
  generalInstructions,
}: {
  generalInstructions: string | null;
}) {
  return (
    <Card>
      <form action={updateGeneralInstructionsAction}>
        <CardHeader>
          <CardTitle>Your standing instructions</CardTitle>
          <CardDescription>
            Apply to every conversation you have, in Chat, Work, and Code alike.
            Only you see this.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <Textarea
            aria-label="Your standing instructions"
            className="min-h-32"
            defaultValue={generalInstructions ?? ""}
            key={generalInstructions}
            maxLength={4000}
            name="generalInstructions"
            placeholder="e.g. I'm a backend engineer; skip basic explanations. Keep answers short unless I ask for detail."
          />
        </CardContent>
        <CardFooter className="pt-4">
          <Button type="submit" variant="outline">
            Save your instructions
          </Button>
          <FormSubmitToast message="Your instructions were saved" />
        </CardFooter>
      </form>
    </Card>
  );
}
