"use client";

import { useTransition } from "react";
import Link from "next/link";
import { ChevronsUpDown, LogOut, Settings, UserRound } from "lucide-react";
import { signOutAction } from "@/app/auth/actions";
import { selectOrganization } from "@/app/workspace/actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { UserOrganization } from "@/organizations/user-organizations";

type AccountMenuProps = {
  activeOrganizationId?: string;
  organizations: UserOrganization[];
  user: { email: string; name?: string | null };
};

export function AccountMenu({
  activeOrganizationId,
  organizations,
  user,
}: AccountMenuProps) {
  const [isPending, startTransition] = useTransition();
  const initials = (user.name || user.email)
    .split(/\s+|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((value) => value[0]?.toUpperCase())
    .join("");

  function switchOrganization(organizationId: string) {
    if (organizationId === activeOrganizationId) return;
    const formData = new FormData();
    formData.set("organizationId", organizationId);
    startTransition(() => void selectOrganization(formData));
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label="Account menu"
          className="w-full justify-start gap-2 rounded-xl px-2 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0"
          disabled={isPending}
          variant="ghost"
        >
          <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-primary/15 text-xs font-semibold text-primary">
            {initials || "P"}
          </span>
          <span className="min-w-0 flex-1 text-left group-data-[collapsible=icon]:hidden">
            <span className="block truncate text-sm font-medium">
              {user.name || "Account"}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {user.email}
            </span>
          </span>
          <ChevronsUpDown
            aria-hidden="true"
            className="size-3.5 text-muted-foreground group-data-[collapsible=icon]:hidden"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel>
          <span className="block truncate font-medium">
            {user.name || "Account"}
          </span>
          <span className="mt-0.5 block truncate font-normal">
            {user.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/workspace/profile">
            <UserRound aria-hidden="true" /> Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/workspace/settings">
            <Settings aria-hidden="true" /> Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Organizations</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          onValueChange={switchOrganization}
          value={activeOrganizationId}
        >
          {organizations.map((organization) => (
            <DropdownMenuRadioItem
              key={organization.id}
              value={organization.id}
            >
              <span className="min-w-0 flex-1 truncate">
                {organization.name}
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => startTransition(() => void signOutAction())}
          variant="destructive"
        >
          <LogOut aria-hidden="true" /> Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
