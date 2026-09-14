import { withAuth } from "@workos-inc/authkit-nextjs";
import { redirect } from "next/navigation";

import { PilotWordmark } from "@/components/brand/pilot-wordmark";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { createOrganizationAction } from "./actions";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Create your workspace" };

/**
 * Where a signed-in user with no WorkOS organization and no domain-matched
 * local workspace lands automatically — but also reachable any time from
 * the account menu's "Create organization" action, for a user who already
 * has a workspace and wants another. SDK Enterprises members can still see
 * this if they want a separate local workspace alongside their org.
 */
export default async function OnboardingPage() {
  const { user } = await withAuth();
  if (!user) redirect("/sign-in");

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col justify-center px-6">
      <PilotWordmark className="mb-8 text-lg" />
      <Card>
        <form action={createOrganizationAction}>
          <CardHeader>
            <CardTitle>Create your workspace</CardTitle>
            <CardDescription>
              You&apos;re signed in as {user.email}. Give your workspace a name
              to get started — you can invite teammates later by verifying your
              company&apos;s email domain in Settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <Field>
              <FieldLabel htmlFor="name">Workspace name</FieldLabel>
              <Input
                autoFocus
                id="name"
                maxLength={200}
                name="name"
                placeholder="Acme Inc."
                required
              />
            </Field>
          </CardContent>
          <CardFooter className="pt-4">
            <Button type="submit">Create workspace</Button>
          </CardFooter>
        </form>
      </Card>
    </main>
  );
}
