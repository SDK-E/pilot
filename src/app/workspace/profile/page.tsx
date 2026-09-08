import { redirect } from "next/navigation";
import { withAuth } from "@workos-inc/authkit-nextjs";

export default async function ProfilePage() {
  const { user } = await withAuth();
  if (!user) redirect("/sign-in");

  return (
    <main className="mx-auto w-full max-w-3xl space-y-8 px-5 py-8 sm:px-8 sm:py-10">
      <header>
        <p className="text-sm text-muted-foreground">Account</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Profile</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account identity is managed securely through WorkOS.
        </p>
      </header>
      <dl className="overflow-hidden rounded-2xl border border-border bg-card/50 text-sm">
        <div className="border-b border-border px-5 py-4">
          <dt className="text-xs text-muted-foreground">Name</dt>
          <dd className="mt-1 font-medium">{user.name || "Not provided"}</dd>
        </div>
        <div className="px-5 py-4">
          <dt className="text-xs text-muted-foreground">Email</dt>
          <dd className="mt-1 font-medium">{user.email}</dd>
        </div>
      </dl>
    </main>
  );
}
