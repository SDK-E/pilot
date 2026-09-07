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
import { startDefaultConversationAction } from "@/app/workspace/worker-actions";

const primaryNavigation = [
  { icon: MessageSquareMore, label: "Chats", href: "/workspace/chats" },
  { icon: UsersRound, label: "Agent fleet", href: "/workspace/fleet" },
  { icon: Bot, label: "Personas", href: "/workspace" },
  { icon: Gauge, label: "Dashboard", href: "/workspace" },
  { icon: Settings, label: "Settings", href: "/workspace" },
] as const;

export function AgentFleetShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="border-r border-sidebar-border">
        <SidebarHeader className="h-16 justify-center px-3">
          <Link
            href="/workspace"
            aria-label="Pilot home"
            className="flex h-10 items-center gap-2 rounded-md px-2 text-lg font-semibold tracking-tight outline-none transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          >
            <span className="grid size-6 place-items-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
              P
            </span>
            <span className="group-data-[collapsible=icon]:hidden">
              Pilot<span className="text-primary">.</span>
            </span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <form action={startDefaultConversationAction}>
                    <SidebarMenuButton type="submit" tooltip="New chat">
                      <Plus aria-hidden="true" />
                      <span>New chat</span>
                    </SidebarMenuButton>
                  </form>
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
        </SidebarContent>
        <SidebarFooter className="p-3">
          <p className="px-2 text-xs text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden">
            Agent fleet
          </p>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="min-w-0 bg-background">
        <header className="flex h-16 items-center border-b border-border px-4">
          <SidebarTrigger aria-label="Toggle navigation" />
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
