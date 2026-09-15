import * as React from "react";

const MOBILE_BREAKPOINT = 768;

function subscribe(query: string) {
  return (onChange: () => void) => {
    const mql = matchMedia(query);
    mql.addEventListener("change", onChange);
    return () => {
      mql.removeEventListener("change", onChange);
    };
  };
}

function matchSnapshot(query: string) {
  return () => matchMedia(query).matches;
}

// `false` on the server (and for the same first client render, before
// hydration can safely diverge) — a real viewport check there would read
// `window.innerWidth`/`matchMedia` during that same first client render and
// could disagree with the server whenever the viewport is near the
// breakpoint, causing a hydration mismatch.
function isServerMatch() {
  return false;
}

/**
 * The one shared breakpoint mechanism for the app: every "is this a compact
 * viewport" check should key off a `useMediaQuery` call with the same query
 * as everything else that needs to agree with it, rather than each caller
 * rolling its own `matchMedia` effect with its own threshold.
 */
// eslint-disable-next-line unicorn/consistent-boolean-name -- "useMediaQuery" is the standard name for this hook shape across the ecosystem (usehooks-ts, Mantine, etc.); boolean-prefixing it would be unrecognizable.
export function useMediaQuery(query: string) {
  return React.useSyncExternalStore(
    subscribe(query),
    matchSnapshot(query),
    isServerMatch,
  );
}

export function useIsMobile() {
  return useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
}
