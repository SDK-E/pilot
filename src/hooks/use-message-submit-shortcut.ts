"use client";

import type { KeyboardEvent } from "react";
import type { SendMessageShortcut } from "@/users/user-preferences";

export function shouldSubmitMessage(
  event: KeyboardEvent<HTMLTextAreaElement>,
  shortcut: SendMessageShortcut,
) {
  if (event.key !== "Enter" || event.nativeEvent.isComposing) return false;
  return shortcut === "enter"
    ? !event.shiftKey
    : event.ctrlKey || event.metaKey;
}

/**
 * Plain Enter adds a line only when the user has meaningful text to continue.
 * This keeps an empty controlled composer equal to an empty string rather than
 * accumulating invisible newline characters.
 */
export function shouldInsertComposerNewline(
  event: KeyboardEvent<HTMLTextAreaElement>,
  shortcut: SendMessageShortcut,
) {
  return (
    event.key === "Enter" &&
    !event.nativeEvent.isComposing &&
    shortcut === "mod_enter" &&
    !event.ctrlKey &&
    !event.metaKey &&
    event.currentTarget.value.trim().length > 0
  );
}
