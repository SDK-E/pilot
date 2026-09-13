"use client";

import Link from "next/link";
import {
  Gauge,
  FolderKanban,
  History,
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
  agentName: string;
  title: string | null;
  updatedLabel: string;
  latestMessagePreview: string | null;
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
  // uiLocale is reserved for Plan 08 i18n runtime integration.
  uiLocale: _uiLocale,
}: AgentFleetShellProps) {
  void _uiLocale;
  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="border-r border-sidebar-border">
        <SidebarHeader className="h-16 justify-center border-b border-sidebar-border px-3">
          <Link
            href="/workspace"
            aria-label="Pilot home"
            className="flex h-10 items-center rounded-xl px-2 text-lg font-semibold tracking-tight outline-none transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          >
            <PilotWordmark className="group-data-[collapsible=icon]:hidden" />
            <PilotWordmark
              compact
              className="hidden group-data-[collapsible=icon]:inline-flex"
            />
          </Link>
        </SidebarHeader>

        <SidebarContent className="gap-0 py-3">
          <SidebarGroup className="px-3 py-0">
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    className="h-10 bg-sidebar-primary text-sidebar-primary-foreground shadow-sm hover:bg-sidebar-primary/90 hover:text-sidebar-primary-foreground data-active:bg-sidebar-primary"
                    tooltip="New chat"
                  >
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

          <SidebarGroup className="min-h-0 flex-1 px-3 pb-0 pt-5 group-data-[collapsible=icon]:hidden">
            <SidebarGroupLabel className="px-2 text-[11px] uppercase tracking-[0.12em] text-sidebar-foreground/55">
              <History aria-hidden="true" className="mr-2 size-3.5" />
              Chat history
            </SidebarGroupLabel>
            <SidebarGroupContent className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
              {recentChats.length ? (
                <SidebarMenu className="gap-0.5 px-0.5">
                  {recentChats.map((chat) => (
                    <SidebarMenuItem key={chat.id}>
                      <SidebarMenuButton
                        asChild
                        className="h-auto min-h-11 items-start px-2.5 py-1.5 text-[13px] font-normal"
                        tooltip={chat.title ?? "New conversation"}
                      >
                        <Link
                          href={`/workspace/workers/${chat.workerId}/conversations/${chat.id}`}
                        >
                          <MessageSquareMore
                            aria-hidden="true"
                            className="mt-0.5 size-3.5"
                          />
                          <span className="min-w-0 leading-4">
                            <span className="block truncate">
                              {chat.title ?? "New conversation"}
                            </span>
                            <span className="block truncate text-[11px] text-sidebar-foreground/55">
                              {chat.latestMessagePreview || chat.agentName}
                            </span>
                            <span className="block text-[10px] text-sidebar-foreground/45">
                              {chat.agentName} · {chat.updatedLabel}
                            </span>
                          </span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              ) : (
                <p className="px-2 py-3 text-xs leading-5 text-sidebar-foreground/55">
                  Your conversations will appear here.
                </p>
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="gap-3 border-t border-sidebar-border p-3">
          <SidebarMenu className="gap-1">
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
        <header className="flex h-16 shrink-0 items-center border-b border-border bg-background/80 px-4 backdrop-blur sm:px-5">
          <SidebarTrigger className="-ml-2" />
          <span className="ml-2 text-sm font-medium tracking-tight">
            Workspace
          </span>
          <div className="ml-auto">
            <ThemeSwitcher />
          </div>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
