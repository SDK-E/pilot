"use client";

import Link from "next/link";
import {
  Bot,
  Gauge,
  MessageSquareMore,
  Plus,
  Settings,
  UsersRound,
} from "lucide-react";
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

const primaryNavigation = [
  { icon: MessageSquareMore, label: "Chats", href: "/workspace/chats" },
  { icon: UsersRound, label: "Agent fleet", href: "/workspace/fleet" },
  { icon: Bot, label: "Personas", href: "/workspace/personas" },
  { icon: Gauge, label: "Dashboard", href: "/workspace/dashboard" },
  { icon: Settings, label: "Settings", href: "/workspace" },
] as const;

type RecentChat = {
  id: string;
  workerId: string;
  title: string | null;
};

type AgentFleetShellProps = {
  children: React.ReactNode;
  recentChats: RecentChat[];
};

export function AgentFleetShell({
  children,
  recentChats,
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
                {primaryNavigation.map((item) => (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton asChild tooltip={item.label}>
                      <Link href={item.href}>
                        <item.icon aria-hidden="true" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          {recentChats.length > 0 ? (
            <SidebarGroup className="group-data-[collapsible=icon]:hidden">
              <SidebarGroupLabel>Recent chats</SidebarGroupLabel>
              <SidebarGroupContent>
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
              </SidebarGroupContent>
            </SidebarGroup>
          ) : null}
        </SidebarContent>
        <SidebarFooter className="p-3">
          <p className="px-2 text-xs text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden">
            Agent fleet
          </p>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="min-w-0 bg-background">
        <header className="flex h-16 items-center border-b border-border px-4 sm:px-5">
          <SidebarTrigger aria-label="Toggle navigation" />
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
