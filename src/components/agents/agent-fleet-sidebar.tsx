"use client";

import Link from "next/link";
import {
  Bot,
  Gauge,
  MessageSquareMore,
  ListTodo,
  ShieldCheck,
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
  { icon: ListTodo, label: "Tasks", href: "/workspace/tasks" },
  { icon: ShieldCheck, label: "Approvals", href: "/workspace/approvals" },
  { icon: UsersRound, label: "Agent fleet", href: "/workspace/fleet" },
  { icon: Bot, label: "Personas", href: "/workspace/personas" },
  { icon: Gauge, label: "Dashboard", href: "/workspace/dashboard" },
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
            <span className="grid size-7 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-foreground group-data-[collapsible=icon]:hidden">
              <PilotWordmark compact />
            </span>
            <PilotWordmark className="group-data-[collapsible=icon]:hidden" />
            <span className="hidden text-lg font-semibold group-data-[collapsible=icon]:inline">
              P
            </span>
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
