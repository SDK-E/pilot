import * as React from "react";

const MOBILE_BREAKPOINT = 768;

function subscribe(onChange: () => void) {
  const mql = matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
  mql.addEventListener("change", onChange);
  return () => {
    mql.removeEventListener("change", onChange);
  };
}

function isMobileSnapshot() {
  return window.innerWidth < MOBILE_BREAKPOINT;
}

// `false` on the server (and for the same first client render, before
// hydration can safely diverge) — a real viewport check there would read
// `window.innerWidth` during that same first client render and could
// disagree with the server whenever the viewport is near the breakpoint,
// causing a hydration mismatch.
function isMobileServerSnapshot() {
  return false;
}

export function useIsMobile() {
  return React.useSyncExternalStore(
    subscribe,
    isMobileSnapshot,
    isMobileServerSnapshot,
  );
}
