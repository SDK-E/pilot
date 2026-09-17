#!/usr/bin/env bash
set -euo pipefail

# `vercel env pull` merges into an existing file — it *keeps* any local var
# not present in the target environment instead of removing it, so a var
# retired on Vercel (or a stray local-only line) lingers forever. Delete the
# file first so a pull always fully mirrors that environment.

ENV_FILE="${1:-.env.local}"
ENVIRONMENT="${2:-development}"

rm -f "$ENV_FILE"
vercel env pull --environment="$ENVIRONMENT" "$ENV_FILE"

# A var flagged "Sensitive" in Vercel's dashboard is write-only — pull always
# returns the literal string "[SENSITIVE]" instead of the real value, for
# every caller, with no CLI flag to opt out. That's Vercel enforcing this at
# the platform level, not a bug in this script, so the fix is never here:
# either read the value from the Vercel dashboard directly (Settings →
# Environment Variables → reveal), or un-flag it there as Sensitive so this
# and `env:push` can manage it like every other var (push-env.sh always adds
# with --no-sensitive, so a var only ends up Sensitive by being set that way
# outside this script — e.g. a Neon/Postgres integration's auto-injected
# DATABASE_URL). Fail loudly here instead of writing a file that silently
# breaks the next command that reads it.
sensitive_vars="$(grep -E '="?\[SENSITIVE\]"?$' "$ENV_FILE" | cut -d= -f1 || true)"
if [ -n "$sensitive_vars" ]; then
  echo "warning: these $ENVIRONMENT vars are Sensitive in Vercel and were NOT pulled (value is literally \"[SENSITIVE]\"):" >&2
  echo "$sensitive_vars" | sed 's/^/  - /' >&2
  echo "Reveal them in the Vercel dashboard, or remove the Sensitive flag there, before relying on $ENV_FILE for these." >&2
fi
