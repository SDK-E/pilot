"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Radix's DismissableLayer (Dialog/Sheet/AlertDialog/Popover/DropdownMenu/
 * Select/Tooltip) locks `document.body.style.pointerEvents = "none"` while
 * open and restores it on its own close — but the restore is keyed off a
 * single module-level "original value" shared by every layer, so two
 * overlapping layers (e.g. a menu opened from inside the mobile sidebar
 * Sheet) or an overlay torn down by a client-side route change instead of
 * its own close animation can leave that lock stuck permanently. The app
 * then renders normally but nothing responds to taps or clicks anywhere.
 * This clears a stale lock whenever nothing Radix-managed is actually open.
 */
function clearStalePointerEventsLock() {
  if (document.body.style.pointerEvents !== "none") return;
  const hasOpenOverlay = document.querySelector(
    '[role="dialog"], [role="alertdialog"], [data-radix-popper-content-wrapper]',
  );
  if (!hasOpenOverlay) document.body.style.pointerEvents = "";
}

export function PointerEventsGuard() {
  const pathname = usePathname();

  useEffect(() => {
    clearStalePointerEventsLock();
  }, [pathname]);

  useEffect(() => {
    const observer = new MutationObserver(clearStalePointerEventsLock);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["style"],
    });
    return () => {
      observer.disconnect();
    };
  }, []);

  return null;
}
