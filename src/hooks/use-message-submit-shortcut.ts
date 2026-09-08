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
