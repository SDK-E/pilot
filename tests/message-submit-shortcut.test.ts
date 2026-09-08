import assert from "node:assert/strict";
import test from "node:test";
import type { KeyboardEvent } from "react";
import { shouldSubmitMessage } from "@/hooks/use-message-submit-shortcut";

function keyEvent(overrides: Record<string, unknown> = {}) {
  return {
    key: "Enter",
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    nativeEvent: { isComposing: false },
    ...overrides,
  } as unknown as KeyboardEvent<HTMLTextAreaElement>;
}

test("Enter mode sends only an ordinary Enter keypress", () => {
  assert.equal(shouldSubmitMessage(keyEvent(), "enter"), true);
  assert.equal(
    shouldSubmitMessage(keyEvent({ shiftKey: true }), "enter"),
    false,
  );
  assert.equal(shouldSubmitMessage(keyEvent({ key: "a" }), "enter"), false);
  assert.equal(
    shouldSubmitMessage(
      keyEvent({ nativeEvent: { isComposing: true } }),
      "enter",
    ),
    false,
  );
});

test("mod-enter mode accepts Ctrl or Command and preserves a plain Enter", () => {
  assert.equal(shouldSubmitMessage(keyEvent(), "mod_enter"), false);
  assert.equal(
    shouldSubmitMessage(keyEvent({ ctrlKey: true }), "mod_enter"),
    true,
  );
  assert.equal(
    shouldSubmitMessage(keyEvent({ metaKey: true }), "mod_enter"),
    true,
  );
});
