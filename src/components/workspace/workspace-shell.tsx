"use client";

import {
  RiFolder3Line,
  RiRobot2Line,
  RiSettings3Line,
  RiShieldStarLine,
  RiSparklingLine,
} from "@remixicon/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { AGENT_KIND_IDS, AGENT_KINDS, modeHref } from "@/agents/agent-kinds";
import { PilotWordmark } from "@/components/brand/pilot-wordmark";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { Separator } from "@/components/ui/separator";
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
import {
  conversationLabel,
  groupRecentConversations,
} from "@/components/workspace/recent-conversations";
import { useWorkspaceHeaderContent } from "@/components/workspace/workspace-header-slot";

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
  isPlatformAdmin?: boolean;
  organizations: { id: string; name: string }[];
  recentConversations: RecentConversation[];
  user: { email: string; name?: string | null };
}

const SECONDARY_LINKS = [
  { href: "/projects", label: "Projects", icon: RiFolder3Line },
  { href: "/agents", label: "Agents", icon: RiRobot2Line },
  { href: "/skills", label: "Skills", icon: RiSparklingLine },
] as const;

function currentMode(pathname: string): AgentKindId | undefined {
  const segment = pathname.split("/", 2)[1];
  return AGENT_KIND_IDS.find((kind) => kind === segment);
}

function ModeNav({ pathname }: { pathname: string }) {
  const active = currentMode(pathname);
  return (
    <SidebarMenu>
      {AGENT_KIND_IDS.map((kind) => (
        <SidebarMenuItem key={kind}>
          <SidebarMenuButton
            asChild
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
      <p className="px-2 py-2 text-xs text-muted-foreground">
        Your conversations will appear here.
      </p>
    );
  }
  const groups = groupRecentConversations(conversations);
  return (
    <div className="flex flex-col gap-3">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="px-2 pb-1 text-xs font-medium text-sidebar-foreground/50">
            {group.label}
          </p>
          <SidebarMenu>
            {group.conversations.map((conversation) => {
              const href = modeHref(conversation.kind, conversation.id);
              const label = conversationLabel(conversation);
              return (
                <SidebarMenuItem key={conversation.id}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === href}
                    tooltip={label}
                  >
                    <Link href={href}>
                      <ModeIcon
                        className="text-muted-foreground"
                        kind={conversation.kind}
                      />
                      <span>{label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </div>
      ))}
    </div>
  );
}

export function WorkspaceShell({
  activeOrganizationId,
  children,
  isPlatformAdmin,
  organizations,
  recentConversations,
  user,
}: WorkspaceShellProps) {
  const pathname = usePathname();
  const mode = currentMode(pathname);
  const headerContent = useWorkspaceHeaderContent();

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                className="justify-center"
                size="lg"
                tooltip="Pilot home"
              >
                <Link href="/chat">
                  <PilotWordmark className="text-2xl group-data-[collapsible=icon]:hidden" />
                  <PilotWordmark
                    className="hidden text-lg group-data-[collapsible=icon]:inline-flex"
                    compact
                  />
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <ModeNav pathname={pathname} />
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
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
          <SidebarGroup className="min-h-0 flex-1 group-data-[collapsible=icon]:hidden">
            <SidebarGroupLabel>Recent</SidebarGroupLabel>
            <SidebarGroupContent className="min-h-0 flex-1 overflow-y-auto">
              <RecentList
                conversations={recentConversations}
                pathname={pathname}
              />
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            {isPlatformAdmin ? (
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith("/admin")}
                  tooltip="Admin"
                >
                  <Link href="/admin">
                    <RiShieldStarLine aria-hidden="true" />
                    <span>Admin</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ) : null}
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith("/settings")}
                tooltip="Settings"
              >
                <Link href="/settings">
                  <RiSettings3Line aria-hidden="true" />
                  <span>Settings</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <AccountMenu
                activeOrganizationId={activeOrganizationId}
                organizations={organizations}
                user={user}
              />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            className="mr-1 data-[orientation=vertical]:h-4"
            orientation="vertical"
          />
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {headerContent ?? (
              <span className="flex items-center gap-2 text-sm font-medium">
                {mode ? <ModeIcon className="size-4" kind={mode} /> : null}
                {mode ? AGENT_KINDS[mode].name : "Workspace"}
              </span>
            )}
          </div>
          <ThemeSwitcher />
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
