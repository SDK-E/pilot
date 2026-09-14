"use client";

import { Bot, FolderKanban, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { AGENT_KIND_IDS, AGENT_KINDS, modeHref } from "@/agents/agent-kinds";
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
import { AccountMenu } from "@/components/workspace/account-menu";
import { ConversationSearch } from "@/components/workspace/conversation-search";
import { ModeIcon } from "@/components/workspace/mode-icon";

import type { AgentKindId } from "@/agents/agent-kinds";

export interface RecentConversation {
  id: string;
  kind: AgentKindId;
  title: string | null;
  agentName: string;
  preview: string | null;
  updatedAt: string;
}

interface WorkspaceShellProps {
  activeOrganizationId?: string;
  children: React.ReactNode;
  organizations: { id: string; name: string }[];
  recentConversations: RecentConversation[];
  user: { email: string; name?: string | null };
}

const SECONDARY_LINKS = [
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/agents", label: "Agents", icon: Bot },
] as const;

function currentMode(pathname: string): AgentKindId | undefined {
  const segment = pathname.split("/", 2)[1];
  return AGENT_KIND_IDS.find((kind) => kind === segment);
}

function ModeNav({ pathname }: { pathname: string }) {
  const active = currentMode(pathname);
  return (
    <SidebarMenu className="gap-1">
      {AGENT_KIND_IDS.map((kind) => (
        <SidebarMenuItem key={kind}>
          <SidebarMenuButton
            asChild
            className="h-10"
            isActive={active === kind}
            tooltip={AGENT_KINDS[kind].name}
          >
            <Link href={modeHref(kind)}>
              <ModeIcon kind={kind} />
              <span>{AGENT_KINDS[kind].name}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

function RecentList({
  conversations,
  pathname,
}: {
  conversations: RecentConversation[];
  pathname: string;
}) {
  if (conversations.length === 0) {
    return (
      <p className="px-2 py-3 text-xs leading-5 text-sidebar-foreground/55">
        Your conversations will appear here.
      </p>
    );
  }
  return (
    <SidebarMenu className="gap-0.5 px-0.5">
      {conversations.map((conversation) => {
        const href = modeHref(conversation.kind, conversation.id);
        return (
          <SidebarMenuItem key={conversation.id}>
            <SidebarMenuButton
              asChild
              className="h-auto min-h-9 items-start px-2.5 py-1.5 text-[13px] font-normal"
              isActive={pathname === href}
              tooltip={conversation.title ?? "New conversation"}
            >
              <Link href={href}>
                <ModeIcon
                  className="mt-0.5 size-3.5 opacity-70"
                  kind={conversation.kind}
                />
                <span className="min-w-0 leading-4">
                  <span className="block truncate">
                    {conversation.title ?? "New conversation"}
                  </span>
                  <span className="block truncate text-[11px] text-sidebar-foreground/55">
                    {conversation.agentName}
                  </span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

/**
 * The app frame: modes at the top of the sidebar (Chat, Work, Code), then
 * Projects and Agents, then recent conversations, then account and settings.
 */
export function WorkspaceShell({
  activeOrganizationId,
  children,
  organizations,
  recentConversations,
  user,
}: WorkspaceShellProps) {
  const pathname = usePathname();
  const mode = currentMode(pathname);

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="border-r border-sidebar-border">
        <SidebarHeader className="h-16 justify-center border-b border-sidebar-border px-3">
          <Link
            href="/chat"
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
              <ModeNav pathname={pathname} />
              <SidebarMenu className="mt-3 gap-1">
                {SECONDARY_LINKS.map(({ href, label, icon: Icon }) => (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname.startsWith(href)}
                      tooltip={label}
                    >
                      <Link href={href}>
                        <Icon aria-hidden="true" />
                        <span>{label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
                <SidebarMenuItem className="group-data-[collapsible=icon]:hidden">
                  <ConversationSearch conversations={recentConversations} />
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup className="min-h-0 flex-1 px-3 pb-0 pt-5 group-data-[collapsible=icon]:hidden">
            <SidebarGroupLabel className="px-2 text-[11px] uppercase tracking-[0.12em] text-sidebar-foreground/55">
              Recent
            </SidebarGroupLabel>
            <SidebarGroupContent className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
              <RecentList
                conversations={recentConversations}
                pathname={pathname}
              />
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="gap-3 border-t border-sidebar-border p-3">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith("/settings")}
                tooltip="Settings"
              >
                <Link href="/settings">
                  <Settings aria-hidden="true" />
                  <span>Settings</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <AccountMenu
            activeOrganizationId={activeOrganizationId}
            organizations={organizations}
            user={user}
          />
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="min-w-0 bg-background">
        <header className="flex h-16 shrink-0 items-center border-b border-border bg-background/80 px-4 backdrop-blur sm:px-5">
          <SidebarTrigger className="-ml-2" />
          <span className="ml-2 flex items-center gap-2 text-sm font-medium tracking-tight">
            {mode ? (
              <ModeIcon className="size-4 text-primary" kind={mode} />
            ) : null}
            {mode ? AGENT_KINDS[mode].name : "Workspace"}
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
