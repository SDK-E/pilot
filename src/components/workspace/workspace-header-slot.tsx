"use client";

import { createContext, useContext, useEffect, useState } from "react";

interface WorkspaceHeaderSlotContextValue {
  content: React.ReactNode;
  setContent: (content: React.ReactNode) => void;
}

const WorkspaceHeaderSlotContext =
  createContext<WorkspaceHeaderSlotContextValue | null>(null);

export function WorkspaceHeaderSlotProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [content, setContent] = useState<React.ReactNode>(null);
  return (
    <WorkspaceHeaderSlotContext.Provider value={{ content, setContent }}>
      {children}
    </WorkspaceHeaderSlotContext.Provider>
  );
}

function useWorkspaceHeaderSlot() {
  const context = useContext(WorkspaceHeaderSlotContext);
  if (!context) {
    throw new Error(
      "useWorkspaceHeaderSlot must be used within a WorkspaceHeaderSlotProvider",
    );
  }
  return context;
}

export function useWorkspaceHeaderContent() {
  return useWorkspaceHeaderSlot().content;
}

export function WorkspaceHeaderContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const { setContent } = useWorkspaceHeaderSlot();
  useEffect(() => {
    setContent(children);
    return () => {
      setContent(null);
    };
  }, [children, setContent]);
  return null;
}
