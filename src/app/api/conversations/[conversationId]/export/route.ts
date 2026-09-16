import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { createElement, type ReactElement } from "react";
import { z } from "zod";

import { ConversationExportDocument } from "@/components/conversations/conversation-export-document";
import { exportMarkdown } from "@/conversations/conversation-export";
import { listConversationMessages } from "@/conversations/conversation-repository";
import { listMessageSources } from "@/conversations/message-sources";
import {
  getWorkspaceSession,
  isWorkspaceSession,
  sessionFailureResponse,
} from "@/organizations/workspace-session";

interface RouteContext {
  params: Promise<{ conversationId: string }>;
}

function notFound() {
  return Response.json({ error: "Conversation not found." }, { status: 404 });
}

/**
 * Downloads the owner's transcript as Markdown or PDF (`?format=md|pdf`).
 */
export async function GET(request: Request, { params }: RouteContext) {
  const session = await getWorkspaceSession();
  if (!isWorkspaceSession(session)) return sessionFailureResponse(session);
  const owner = {
    organizationId: session.organizationId,
    userId: session.user.id,
  };

  const { conversationId: rawConversationId } = await params;
  const conversationId = z.uuid().safeParse(rawConversationId);
  if (!conversationId.success) return notFound();
  const format = new URL(request.url).searchParams.get("format");
  if (format !== "md" && format !== "pdf") {
    return Response.json(
      { error: "Choose Markdown or PDF export." },
      { status: 400 },
    );
  }

  const messages = await listConversationMessages(owner, conversationId.data);
  if (!messages) return notFound();
  const sources = await listMessageSources({
    ...owner,
    conversationId: conversationId.data,
  });

  if (format === "md") {
    return new Response(exportMarkdown(messages, sources), {
      headers: {
        "content-type": "text/markdown; charset=utf-8",
        "content-disposition": `attachment; filename="pilot-conversation-${conversationId.data}.md"`,
      },
    });
  }
  const document = createElement(ConversationExportDocument, {
    messages,
    sources,
  });
  // @react-pdf/renderer's `createElement` return type and `renderToBuffer`'s
  // expected `ReactElement<DocumentProps>` param are structurally
  // compatible but nominally distinct types from this library's own
  // typings — a direct cast fails, so this goes through `unknown` first.
  const pdf = await renderToBuffer(
    document as unknown as ReactElement<DocumentProps>,
  );
  return new Response(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="pilot-conversation-${conversationId.data}.pdf"`,
      "cache-control": "private, no-store",
    },
  });
}
