import { AgentFleetShell } from "@/components/agents/agent-fleet-sidebar";

export default function WorkspaceLayout({
  children,
}: LayoutProps<"/workspace">) {
  return <AgentFleetShell>{children}</AgentFleetShell>;
}
