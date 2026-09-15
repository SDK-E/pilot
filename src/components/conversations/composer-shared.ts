// Shared between MessageComposer (an open conversation) and
// NewConversationForm (a mode's start screen) so their docked composer
// surfaces read as one consistent control, not two independently drifting
// implementations.
export const COMPOSER_WRAPPER_CLASSNAME =
  "rounded-xl border bg-card p-2 shadow-sm transition-shadow focus-within:shadow-md";

/**
 * A composer can submit once there's non-blank text and nothing else is in
 * flight. Each caller decides what "in flight" means for it — uploading an
 * attachment, starting a new conversation — and, separately, whether a
 * mid-stream "Stop" affordance should force the button enabled regardless of
 * this result.
 */
export function useComposerSubmitState({
  text,
  isBusy,
}: {
  text: string;
  isBusy: boolean;
}) {
  const canSubmit = text.trim().length > 0 && !isBusy;
  return { canSubmit, isDisabled: !canSubmit };
}
