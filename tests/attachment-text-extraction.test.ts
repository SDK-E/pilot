import assert from "node:assert/strict";
import test from "node:test";
import {
  extractAttachmentText,
  isTextExtractableContentType,
} from "@/conversations/attachment-text-extraction";

test("recognizes only the private attachment formats with a text extractor", () => {
  assert.equal(isTextExtractableContentType("text/plain"), true);
  assert.equal(isTextExtractableContentType("application/pdf"), true);
  assert.equal(
    isTextExtractableContentType(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ),
    true,
  );
  assert.equal(
    isTextExtractableContentType(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ),
    false,
  );
  assert.equal(isTextExtractableContentType("image/png"), false);
});

test("decodes a plain-text attachment without interpreting it as instructions", async () => {
  const text = await extractAttachmentText({
    contentType: "text/plain",
    bytes: new TextEncoder().encode("untrusted attachment text"),
  });
  assert.equal(text, "untrusted attachment text");
});
