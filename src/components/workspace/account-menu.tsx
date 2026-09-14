"use client";

import {
  RiAddLine,
  RiExpandUpDownLine,
  RiLogoutBoxRLine,
  RiSettings3Line,
} from "@remixicon/react";
import Link from "next/link";
import { useTransition } from "react";

import {
  selectLocalOrganizationAction,
  selectOrganizationAction,
} from "@/app/(workspace)/actions";
import { signOutAction } from "@/app/auth/actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { SidebarMenuButton } from "@/components/ui/sidebar";

import type { UserOrganization } from "@/organizations/user-organizations";

interface AccountMenuProps {
  activeOrganizationId?: string;
  organizations: UserOrganization[];
  user: { email: string; name?: string | null };
}

function initialsOf(user: AccountMenuProps["user"]) {
  return (
    (user.name ?? user.email)
      .split(/\s+|@/)
      .filter(Boolean)
      .slice(0, 2)
      .map((value) => value[0]?.toUpperCase())
      .join("") || "P"
  );
}

/**
 * The account block at the bottom of the sidebar: who is signed in, which
 * organization is active, and sign out.
 */
export function AccountMenu({
  activeOrganizationId,
  organizations,
  user,
}: AccountMenuProps) {
  const [isPending, startTransition] = useTransition();

  function switchOrganization(organizationId: string) {
    if (organizationId === activeOrganizationId) return;
    const formData = new FormData();
    formData.set("organizationId", organizationId);
    const action = organizationId.startsWith("local_")
      ? selectLocalOrganizationAction
      : selectOrganizationAction;
    startTransition(() => void action(formData));
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton
          aria-label="Account menu"
          disabled={isPending}
          size="lg"
        >
          <Avatar className="size-6">
            <AvatarFallback>{initialsOf(user)}</AvatarFallback>
          </Avatar>
          <span className="grid min-w-0 flex-1 leading-tight">
            <span className="truncate font-medium">
              {user.name ?? "Account"}
            </span>
            <span className="truncate text-muted-foreground">{user.email}</span>
          </span>
          <RiExpandUpDownLine aria-hidden="true" className="ml-auto" />
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64" side="top">
        <DropdownMenuLabel className="grid leading-tight">
          <span className="truncate">{user.name ?? "Account"}</span>
          <span className="truncate font-normal text-muted-foreground">
            {user.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <RiSettings3Line aria-hidden="true" /> Settings
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
              <span className="truncate">{organization.name}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuItem asChild>
          <Link href="/onboarding">
            <RiAddLine aria-hidden="true" /> Create organization
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            startTransition(() => void signOutAction());
          }}
          variant="destructive"
        >
          <RiLogoutBoxRLine aria-hidden="true" /> Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
