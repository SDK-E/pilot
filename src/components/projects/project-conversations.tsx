import Link from "next/link";

import { modeHref, type AgentKindId } from "@/agents/agent-kinds";
import {
  addProjectConversationAction,
  removeProjectConversationAction,
} from "@/app/(workspace)/projects/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ModeIcon } from "@/components/workspace/mode-icon";

interface ProjectChat {
  id: string;
  kind: AgentKindId;
  title: string | null;
  agentName: string;
}

/**
 * The conversations in a project, and a picker to add another one of the
 * user's own conversations.
 */
export function ProjectConversations({
  projectId,
  members,
  candidates,
}: {
  projectId: string;
  members: ProjectChat[];
  candidates: ProjectChat[];
}) {
  const memberIds = new Set(members.map((chat) => chat.id));
  const available = candidates.filter((chat) => !memberIds.has(chat.id));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conversations</CardTitle>
        <CardDescription>
          Only your private conversations can be added. Moving a conversation
          here removes it from its previous project.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {available.length > 0 ? (
          <form
            action={addProjectConversationAction}
            className="flex flex-wrap gap-2"
          >
            <input name="projectId" type="hidden" value={projectId} />
            <Select name="conversationId" required>
              <SelectTrigger className="min-w-64">
                <SelectValue placeholder="Choose a conversation" />
              </SelectTrigger>
              <SelectContent>
                {available.map((chat) => (
                  <SelectItem key={chat.id} value={chat.id}>
                    {chat.title ?? "New conversation"} · {chat.agentName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit" variant="outline">
              Add conversation
            </Button>
          </form>
        ) : null}
        {members.length > 0 ? (
          <ItemGroup>
            {members.map((chat) => (
              <Item key={chat.id} variant="outline">
                <ItemContent>
                  <ItemTitle>
                    <Link
                      className="flex items-center gap-2 hover:underline"
                      href={modeHref(chat.kind, chat.id)}
                    >
                      <ModeIcon
                        className="size-3.5 text-muted-foreground"
                        kind={chat.kind}
                      />
                      {chat.title ?? "New conversation"}
                    </Link>
                  </ItemTitle>
                  <ItemDescription>{chat.agentName}</ItemDescription>
                </ItemContent>
                <ItemActions>
                  <form action={removeProjectConversationAction}>
                    <input name="projectId" type="hidden" value={projectId} />
                    <input
                      name="conversationId"
                      type="hidden"
                      value={chat.id}
                    />
                    <Button size="sm" type="submit" variant="ghost">
                      Remove
                    </Button>
                  </form>
                </ItemActions>
              </Item>
            ))}
          </ItemGroup>
        ) : (
          <p className="text-xs text-muted-foreground">
            Add a conversation to start organizing this project.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
