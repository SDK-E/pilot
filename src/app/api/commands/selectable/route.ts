import { listCommands } from "@/commands/command-repository";
import {
  getWorkspaceSession,
  isWorkspaceSession,
  sessionFailureResponse,
} from "@/organizations/workspace-session";

export const runtime = "nodejs";

/**
 * The composer's `/` command palette options: every command the
 * organization has authored, regardless of agent — a command has no tool
 * grants of its own (unlike a plugin, which is what gates access to tools),
 * so there is nothing here that needs per-agent narrowing.
 */
export async function GET() {
  const session = await getWorkspaceSession();
  if (!isWorkspaceSession(session)) return sessionFailureResponse(session);

  const commands = await listCommands(session.organizationId);

  return Response.json({
    commands: commands.map((command) => ({
      id: command.id,
      name: command.name,
      description: command.description,
      promptTemplate: command.promptTemplate,
    })),
  });
}
