import assert from "node:assert/strict";
import test from "node:test";

import {
  exportBlocks,
  exportMarkdown,
} from "@/conversations/conversation-export";

test("the PDF export converts visible Markdown into readable blocks", () => {
  assert.deepEqual(
    exportBlocks(
      "## Findings\n\n- **Useful** [source](https://example.com)\n\n```ts\nconst result = true;\n```",
    ),
    [
      { heading: true, text: "Findings" },
      { heading: false, text: "• Useful source" },
      { heading: false, text: "const result = true;" },
    ],
  );
});

test("the Markdown export lists each message with its sources", () => {
  const markdown = exportMarkdown(
    [
      { id: "m1", role: "user", content: "Hello" },
      { id: "m2", role: "worker", content: "Hi" },
    ],
    [
      {
        messageId: "m2",
        title: "example.com",
        domain: "example.com",
        url: "https://example.com",
        summary: "Cited.",
      },
    ],
  );
  assert.equal(
    markdown,
    "## You\n\nHello\n\n## Pilot\n\nHi\n- [example.com](https://example.com) — Cited.\n",
  );
});
