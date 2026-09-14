import { cn } from "cn";
import Image from "next/image";

const MARK_SIZE = { width: 96, height: 40 };
const FAVICON_SIZE = { width: 40, height: 40 };

/**
 * The Pilot mark, as the two SVGs in /public: the full "Pilot." lockup, or
 * (compact) just "P." for tight spaces like a collapsed sidebar rail. Both
 * light- and dark-ground variants render together and the `dark:` variant
 * toggles which one is visible, so the swap needs no client-side theme read.
 */
export function PilotWordmark({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const size = compact ? FAVICON_SIZE : MARK_SIZE;
  const lightSrc = compact ? "/favicon-light.svg" : "/mark-light.svg";
  const darkSrc = compact ? "/favicon-dark.svg" : "/mark-dark.svg";

  return (
    <span className={cn("inline-flex items-center", className)}>
      <Image
        alt="Pilot"
        className="h-[1em] w-auto dark:hidden"
        priority
        src={lightSrc}
        unoptimized
        {...size}
      />
      <Image
        alt="Pilot"
        className="hidden h-[1em] w-auto dark:block"
        priority
        src={darkSrc}
        unoptimized
        {...size}
      />
    </span>
  );
}
