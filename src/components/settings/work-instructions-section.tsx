import { updateWorkInstructionsAction } from "@/app/(workspace)/settings/actions";
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

export function WorkInstructionsSection({
  workInstructions,
}: {
  workInstructions: string | null;
}) {
  return (
    <Card>
      <form action={updateWorkInstructionsAction}>
        <CardHeader>
          <CardTitle>Work standing instructions</CardTitle>
          <CardDescription>
            Apply automatically to every conversation you start or continue in
            Work — never Chat or Code. Only you see this; it doesn&apos;t change
            what other members of this organization see.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <Textarea
            aria-label="Work standing instructions"
            className="min-h-32"
            defaultValue={workInstructions ?? ""}
            key={workInstructions}
            maxLength={4000}
            name="workInstructions"
            placeholder="e.g. Always cite sources. Prefer bullet points over long paragraphs. Flag anything that needs my approval before it's final."
          />
        </CardContent>
        <CardFooter className="pt-4">
          <Button type="submit" variant="outline">
            Save Work instructions
          </Button>
          <FormSubmitToast message="Work instructions saved" />
        </CardFooter>
      </form>
    </Card>
  );
}
