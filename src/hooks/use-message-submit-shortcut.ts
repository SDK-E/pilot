"use client";

import type { SendMessageShortcut } from "@/users/user-preferences";
import type { KeyboardEvent } from "react";

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
 * Submits the surrounding form when the keystroke is the user's send
 * shortcut. Returns whether it did, so the caller can stop handling the key.
 */
export function submitOnShortcut(
  event: KeyboardEvent<HTMLTextAreaElement>,
  shortcut: SendMessageShortcut,
) {
  if (!shouldSubmitMessage(event, shortcut)) return false;
  event.preventDefault();
  event.currentTarget.form?.requestSubmit();
  return true;
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
