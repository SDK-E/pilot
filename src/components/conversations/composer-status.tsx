import { RiRobot2Line } from "@remixicon/react";

import { Button } from "@/components/ui/button";

/**
 * The validation, upload, stream, and timeout messages under the composer,
 * plus the standing "Pilot can make mistakes" note.
 */
export function ComposerStatus({
  errorId,
  validationError,
  errorMessage,
  timeoutError,
  isLoading,
  onRestoreLastPrompt,
  onCancel,
}: {
  errorId: string;
  validationError?: string;
  errorMessage?: string;
  timeoutError?: string;
  isLoading: boolean;
  onRestoreLastPrompt: () => void;
  onCancel: () => void;
}) {
  return (
    <>
      {validationError ? (
        <p
          aria-live="assertive"
          className="mt-2 px-2 text-xs text-destructive"
          id={errorId}
          role="alert"
        >
          {validationError}
        </p>
      ) : null}
      {errorMessage ? (
        <div className="mt-2 space-y-2 px-2">
          <p
            aria-live="assertive"
            className="text-xs text-destructive"
            role="alert"
          >
            {errorMessage}
          </p>
          {timeoutError ? (
            <div className="flex items-center gap-2">
              <Button onClick={onRestoreLastPrompt} size="sm" type="button">
                Review message
              </Button>
              <Button
                onClick={onCancel}
                size="sm"
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
      <p
        aria-live="polite"
        className="mt-2 inline-flex items-center gap-2 px-2 text-xs text-muted-foreground"
      >
        <RiRobot2Line aria-hidden="true" className="text-primary" />
        {isLoading
          ? "Pilot is working…"
          : "Pilot can make mistakes. Check important work."}
      </p>
    </>
  );
}
