"use client";

import { createContext, useContext } from "react";
import type { SendMessageShortcut } from "@/users/user-preferences";

const ComposerPreferencesContext =
  createContext<SendMessageShortcut>("mod_enter");

export function ComposerPreferencesProvider({
  children,
  sendMessageShortcut,
}: {
  children: React.ReactNode;
  sendMessageShortcut: SendMessageShortcut;
}) {
  return (
    <ComposerPreferencesContext value={sendMessageShortcut}>
      {children}
    </ComposerPreferencesContext>
  );
}

export function useSendMessageShortcut() {
  return useContext(ComposerPreferencesContext);
}
