"use client";

import { useActionState } from "react";

import {
  addPlatformAdminAction,
  removePlatformAdminAction,
  type AdminFormState,
} from "@/app/admin/admins/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { PlatformAdminRole } from "@/platform/platform-admin-repository";

const initialState: AdminFormState = { status: "idle" };

export interface PlatformAdminRow {
  id: string;
  workosUserId: string;
  email: string;
  role: PlatformAdminRole;
}

function RemoveAdminButton({
  admin,
  disabled,
}: {
  admin: PlatformAdminRow;
  disabled: boolean;
}) {
  const [state, action, pending] = useActionState(
    removePlatformAdminAction,
    initialState,
  );
  return (
    <form action={action} className="flex items-center gap-2">
      <input name="workosUserId" type="hidden" value={admin.workosUserId} />
      <Button
        disabled={disabled || pending}
        size="sm"
        type="submit"
        variant="ghost"
      >
        {pending ? "Removing…" : "Remove"}
      </Button>
      {state.status === "error" ? (
        <span className="text-xs text-destructive">{state.message}</span>
      ) : null}
    </form>
  );
}

/**
 * Superadmin-only: add or remove who else can administer Pilot. A regular
 * admin sees the list read-only — only a superadmin can change it, so the
 * group can never be escalated by someone who isn't already at that level.
 */
export function AdminManagement({
  admins,
  isSuperadmin,
  currentWorkosUserId,
}: {
  admins: PlatformAdminRow[];
  isSuperadmin: boolean;
  currentWorkosUserId: string;
}) {
  const [state, action, pending] = useActionState(
    addPlatformAdminAction,
    initialState,
  );

  return (
    <div className="space-y-6">
      <ul className="divide-y divide-border rounded-xl border">
        {admins.map((admin) => (
          <li
            className="flex items-center justify-between px-4 py-3"
            key={admin.id}
          >
            <div>
              <p className="text-sm font-medium">
                {admin.email}
                {admin.workosUserId === currentWorkosUserId ? " (you)" : ""}
              </p>
              <p className="text-xs text-muted-foreground">{admin.role}</p>
            </div>
            {isSuperadmin ? (
              <RemoveAdminButton
                admin={admin}
                disabled={admin.workosUserId === currentWorkosUserId}
              />
            ) : null}
          </li>
        ))}
      </ul>

      {isSuperadmin ? (
        <form action={action} className="space-y-3 rounded-xl border p-4">
          <p className="text-sm font-medium">Add an admin</p>
          <p className="text-xs text-muted-foreground">
            They must have already signed in to Pilot at least once — Pilot
            looks their WorkOS account up by email.
          </p>
          <div className="flex gap-2">
            <div className="flex-1 space-y-1">
              <Label className="sr-only" htmlFor="admin-email">
                Email
              </Label>
              <Input
                id="admin-email"
                name="email"
                placeholder="colleague@example.com"
                required
                type="email"
              />
            </div>
            <select
              className="rounded-md border border-input bg-transparent px-3 text-sm"
              defaultValue="admin"
              name="role"
            >
              <option value="admin">Admin</option>
              <option value="superadmin">Superadmin</option>
            </select>
            <Button disabled={pending} type="submit">
              {pending ? "Adding…" : "Add"}
            </Button>
          </div>
          {state.message ? (
            <p
              className={
                state.status === "error"
                  ? "text-sm text-destructive"
                  : "text-sm text-primary"
              }
            >
              {state.message}
            </p>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}
