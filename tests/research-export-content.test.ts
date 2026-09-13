import assert from "node:assert/strict";
import test from "node:test";
import { researchExportBlocks } from "@/conversations/research-export-content";

test("research export converts visible Markdown into readable PDF blocks", () => {
  assert.deepEqual(
    researchExportBlocks(
      "## Findings\n\n- **Useful** [source](https://example.com)\n\n```ts\nconst result = true;\n```",
    ),
    [
      { heading: true, text: "Findings" },
      { heading: false, text: "• Useful source" },
      { heading: false, text: "const result = true;" },
    ],
  );
});
