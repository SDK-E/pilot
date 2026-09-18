#!/usr/bin/env bash
set -euo pipefail

# Reports which env vars pilot needs are missing, surfacing the gap here
# before it becomes a runtime crash. `development` reads .env.local (what
# your local server actually sees); `preview`/`production` query Vercel
# directly (what that deployment actually has), since .env.local may be
# stale.

ENVIRONMENT="${1:-development}"

REQUIRED_CORE=(
  DATABASE_URL
  WORKOS_API_KEY
  WORKOS_CLIENT_ID
  WORKOS_COOKIE_PASSWORD
  NEXT_PUBLIC_WORKOS_REDIRECT_URI
)
REQUIRED_RUNTIME=(
  PILOT_AI_RUNTIME_URL
  WORKOS_M2M_AUTHKIT_DOMAIN
  WORKOS_M2M_CLIENT_ID
  WORKOS_M2M_CLIENT_SECRET
)
REQUIRED_PLATFORM=(
  MODEL_GATEWAY_ENCRYPTION_KEY
)
REQUIRED_CONNECTORS=(
  CONNECTOR_TOKEN_ENCRYPTION_KEY
  CONNECTOR_STATE_SIGNING_SECRET
)
# The external HTTP cron scheduler's bearer secret (cron-job.org) is
# admin-managed (platform_secrets' cron_secret key, Settings → Admin →
# Connector providers) rather than an env var — see ADR-0024/ADR-0026.
OPTIONAL=(
  NEXT_PUBLIC_SITE_URL
  BLOB_READ_WRITE_TOKEN
  DATABASE_URL_UNPOOLED
  VERCEL_OIDC_TOKEN
)

if [ "$ENVIRONMENT" = "development" ]; then
  SOURCE_DESC=".env.local"
  ENV_FILE="${2:-.env.local}"
  present() {
    [ -f "$ENV_FILE" ] && grep -qE "^$1=.+" "$ENV_FILE"
  }
else
  SOURCE_DESC="Vercel ($ENVIRONMENT)"
  REMOTE_NAMES="$(vercel env ls "$ENVIRONMENT" 2>&1 \
    | grep -E '^[[:space:]]+[A-Za-z_][A-Za-z0-9_]*[[:space:]]+' \
    | awk '{print $1}' \
    | sort -u \
    | grep -v '^name$')"
  present() {
    printf '%s\n' "$REMOTE_NAMES" | grep -qx "$1"
  }
fi

missing_required=0
echo "Checking pilot against $SOURCE_DESC"
echo

check_group() {
  local label="$1"
  shift
  echo "-- $label --"
  local name
  for name in "$@"; do
    if present "$name"; then
      echo "  OK      $name"
    else
      echo "  MISSING $name"
      missing_required=1
    fi
  done
}

check_group "Core (auth, database) — every request needs these" "${REQUIRED_CORE[@]}"
check_group "Chat/Work/Code runtime (pilot-ai M2M call)" "${REQUIRED_RUNTIME[@]}"
check_group "Platform admin (model gateways)" "${REQUIRED_PLATFORM[@]}"
check_group "Connectors (per-provider OAuth credentials: Settings → Admin → Connector providers)" "${REQUIRED_CONNECTORS[@]}"

echo "-- Optional / platform-managed --"
for name in "${OPTIONAL[@]}"; do
  if present "$name"; then
    echo "  OK      $name"
  else
    echo "  --      $name (not set, has a code default or is platform-injected)"
  fi
done

echo
if [ "$missing_required" -eq 1 ]; then
  echo "RESULT: missing required vars for $ENVIRONMENT — see MISSING lines above."
  exit 1
fi
echo "RESULT: all required vars present for $ENVIRONMENT."
