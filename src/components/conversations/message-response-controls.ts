import { CompactCodeBlock } from "@/components/conversations/compact-code-block";

import type { MessageResponseProps } from "@/components/ai-elements/message";

/**
 * A code block has nothing worth downloading as a file — copying it is
 * enough, and the button otherwise just adds another control to every
 * fenced snippet Pilot renders. Tables keep their own download control
 * (CSV/TSV export is a real use case there), so this only narrows `code`.
 * Redundant once `MESSAGE_RESPONSE_COMPONENTS` replaces the `pre` renderer
 * below (which never shows a download control at all), but harmless to pass
 * alongside it everywhere `MessageResponse` is used.
 */
export const MESSAGE_RESPONSE_CONTROLS: NonNullable<
  MessageResponseProps["controls"]
> = { code: { download: false } };

/**
 * Pilot's own compact code block everywhere, replacing Streamdown's default
 * fenced-code chrome (see `CompactCodeBlock`'s own comment for why).
 */
export const MESSAGE_RESPONSE_COMPONENTS: NonNullable<
  MessageResponseProps["components"]
> = { pre: CompactCodeBlock };
