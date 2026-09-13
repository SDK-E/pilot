"use client";

import Link from "next/link";
import {
  Gauge,
  FolderKanban,
  MessageSquareMore,
  Plus,
  Settings,
} from "lucide-react";
import { AccountMenu } from "@/components/agents/account-menu";
import { PilotWordmark } from "@/components/brand/pilot-wordmark";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

type RecentChat = {
  id: string;
  workerId: string;
  title: string | null;
};

type AgentFleetShellProps = {
  activeOrganizationId?: string;
  children: React.ReactNode;
  organizations: Array<{ id: string; name: string }>;
  recentChats: RecentChat[];
  user?: { email: string; name?: string | null };
  uiLocale?: string | null;
};

export function AgentFleetShell({
  activeOrganizationId,
  children,
  organizations,
  recentChats,
  user,
  // uiLocale is reserved for Plan 08 i18n runtime integration
  uiLocale:
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _uiLocale,
}: AgentFleetShellProps) {
  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="border-r border-sidebar-border">
        <SidebarHeader className="h-16 justify-center px-3">
          <Link
            href="/workspace"
            aria-label="Pilot home"
            className="flex h-10 items-center gap-2 rounded-md px-2 text-lg font-semibold tracking-tight outline-none transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          >
            <PilotWordmark className="group-data-[collapsible=icon]:hidden" />
            <PilotWordmark
              compact
              className="hidden group-data-[collapsible=icon]:inline-flex"
            />
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="New chat">
                    <Link href="/workspace">
                      <Plus aria-hidden="true" />
                      <span>New chat</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Chats">
                    <Link href="/workspace/chats">
                      <MessageSquareMore aria-hidden="true" />
                      <span>Chats</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup className="mt-auto group-data-[collapsible=icon]:hidden">
            <SidebarGroupLabel>Chat history</SidebarGroupLabel>
            <SidebarGroupContent>
              {recentChats.length ? (
                <SidebarMenu>
                  {recentChats.map((chat) => (
                    <SidebarMenuItem key={chat.id}>
                      <SidebarMenuButton
                        asChild
                        tooltip={chat.title ?? "New conversation"}
                      >
                        <Link
                          href={`/workspace/workers/${chat.workerId}/conversations/${chat.id}`}
                        >
                          <MessageSquareMore aria-hidden="true" />
                          <span>{chat.title ?? "New conversation"}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              ) : (
                <p className="px-3 py-2 text-xs text-sidebar-foreground/60">
                  No chats yet
                </p>
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="space-y-2 p-3">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Dashboard">
                <Link href="/workspace/dashboard">
                  <Gauge aria-hidden="true" />
                  <span>Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Projects">
                <Link href="/workspace/projects">
                  <FolderKanban aria-hidden="true" />
                  <span>Projects</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Settings">
                <Link href="/workspace/settings">
                  <Settings aria-hidden="true" />
                  <span>Settings</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          {user ? (
            <AccountMenu
              activeOrganizationId={activeOrganizationId}
              organizations={organizations}
              user={user}
            />
          ) : null}
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="min-w-0 bg-background">
        <header className="flex h-16 items-center border-b border-border px-4 sm:px-5">
          <SidebarTrigger />
          <span className="ml-3 text-sm text-muted-foreground">Workspace</span>
          <div className="ml-auto">
            <ThemeSwitcher />
          </div>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
