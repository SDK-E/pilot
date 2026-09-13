import { withAuth } from "@workos-inc/authkit-nextjs";
import { z } from "zod";
import {
  getConversation,
  listConversationMessages,
} from "@/conversations/conversation-repository";
import { listMessageSources } from "@/conversations/research-evidence";
import { getActiveOrganizationMembership } from "@/organizations/active-membership";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { createElement, type ReactElement } from "react";
import { ResearchExportDocument } from "@/components/conversations/research-export-document";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  const { user, organizationId } = await withAuth({ ensureSignedIn: true });
  const { conversationId } = await params;
  const workerId = new URL(request.url).searchParams.get("workerId");
  const format = new URL(request.url).searchParams.get("format");
  if (
    !organizationId ||
    !z.uuid().safeParse(conversationId).success ||
    !z.uuid().safeParse(workerId).success ||
    !(await getActiveOrganizationMembership(user.id, organizationId))
  )
    return Response.json({ error: "Conversation not found." }, { status: 404 });
  const conversation = await getConversation(
    organizationId,
    workerId!,
    conversationId,
    user.id,
  );
  const messages = conversation
    ? await listConversationMessages(
        organizationId,
        workerId!,
        conversationId,
        user.id,
      )
    : undefined;
  if (!messages)
    return Response.json({ error: "Conversation not found." }, { status: 404 });
  const sources = await listMessageSources({
    organizationId,
    conversationId,
    userId: user.id,
  });
  const markdown = messages
    .map((message) =>
      [
        `## ${message.role === "user" ? "You" : "Pilot"}`,
        "",
        message.content,
        ...sources
          .filter((source) => source.messageId === message.id)
          .map(
            (source) =>
              `- [${source.title}](${source.url}) — ${source.summary}`,
          ),
        "",
      ].join("\n"),
    )
    .join("\n");
  if (format === "md")
    return new Response(markdown, {
      headers: {
        "content-type": "text/markdown; charset=utf-8",
        "content-disposition": `attachment; filename="pilot-research-${conversationId}.md"`,
      },
    });
  if (format !== "pdf") {
    return Response.json(
      { error: "Choose Markdown or PDF export." },
      { status: 400 },
    );
  }
  const document = createElement(ResearchExportDocument, { messages, sources });
  const pdf = await renderToBuffer(
    document as unknown as ReactElement<DocumentProps>,
  );
  return new Response(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="pilot-conversation-${conversationId}.pdf"`,
      "cache-control": "private, no-store",
    },
  });
}
