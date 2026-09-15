"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import {
  isValidElement,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";

import type { ExtraProps } from "streamdown";

const COPIED_RESET_MS = 2000;

function extractText(root: ReactNode): string {
  let text = "";
  const queue: ReactNode[] = [root];
  while (queue.length > 0) {
    const node = queue.shift();
    if (typeof node === "string") {
      text += node;
    } else if (typeof node === "number") {
      text += String(node);
    } else if (Array.isArray(node)) {
      queue.unshift(...(node as ReactNode[]));
    } else if (isValidElement(node)) {
      queue.unshift((node.props as { children?: ReactNode }).children);
    }
  }
  return text;
}

/**
 * Pilot's fenced-code rendering everywhere — replies and the activity trace
 * alike — shaped after AI Elements' own plainer `CodeBlockContainer` (one
 * bordered box: `rounded-md border bg-background`) rather than Streamdown's
 * newer, heavier default (a `bg-sidebar` card wrapping a second bordered
 * body box, with the copy/download toolbar overlaid on top via a negative
 * margin). One small box, one inline copy button positioned within that
 * same box — never floating above it — and no download control: Pilot's
 * code is either a short command's output or a snippet to read, not a file
 * worth saving. Text is extracted and re-rendered plain (skipping
 * Streamdown's own nested `code` element) so it never inherits inline-code
 * pill styling. This is a deliberate trade of syntax highlighting for a
 * lighter, consistent block everywhere Pilot shows code.
 */
export function CompactCodeBlock({
  children,
}: ComponentProps<"pre"> & ExtraProps) {
  const [isCopied, setIsCopied] = useState(false);
  const text = extractText(children).replace(/\n$/, "");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => {
        setIsCopied(false);
      }, COPIED_RESET_MS);
    } catch {
      // Clipboard access can be unavailable in an embedded browser.
    }
  };

  return (
    <div className="group/code relative my-1.5 overflow-hidden rounded-md border bg-background">
      <pre className="max-h-96 overflow-auto p-2 pr-8 font-mono text-[11px] leading-5">
        {text}
      </pre>
      <button
        aria-label={isCopied ? "Copied" : "Copy"}
        className="absolute top-1.5 right-1.5 text-muted-foreground hover:text-foreground"
        onClick={() => void copy()}
        type="button"
      >
        {isCopied ? (
          <CheckIcon className="size-3.5" />
        ) : (
          <CopyIcon className="size-3.5" />
        )}
      </button>
    </div>
  );
}
