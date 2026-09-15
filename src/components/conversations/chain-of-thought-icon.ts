import type { ChainOfThoughtStep } from "@/components/ai-elements/chain-of-thought";
import type { RemixiconComponentType } from "@remixicon/react";
import type { ComponentProps } from "react";

/**
 * The vendored ChainOfThoughtStep's `icon` prop is typed for lucide-react's
 * component shape (a ForwardRefExoticComponent). Remixicon icons render
 * identically there — the prop is only ever used as `<Icon className="..." />`
 * — but are structurally a class component, so TypeScript rejects the direct
 * assignment. Casting through this one helper avoids importing lucide-react
 * (banned outside vendored files) just to reference its type.
 */
export function asChainOfThoughtIcon(
  icon: RemixiconComponentType,
): ComponentProps<typeof ChainOfThoughtStep>["icon"] {
  return icon as unknown as ComponentProps<typeof ChainOfThoughtStep>["icon"];
}
