#!/usr/bin/env bash

set -euo pipefail

pnpm build

if [[ "${DEPLOY_ENVIRONMENT:-}" == "Preview" ]]; then
  set -- --name "planningpoker-pr-${PR_NUMBER}"
elif [[ "${DEPLOY_ENVIRONMENT:-}" == "Production" ]]; then
  set -- --domain "$PRODUCTION_BASE_URL"
else
  set --
fi

mkdir -p .tmp
wrangler_output_file=".tmp/wrangler-output.json"
: > "$wrangler_output_file"

WRANGLER_OUTPUT_FILE_PATH="$wrangler_output_file" pnpm wrangler deploy "$@"

deployed_url="$(jq -r 'select(.type == "deploy") | .targets[-1] | capture("^(?<url>\\S+)").url' "$wrangler_output_file" | tail -n 1)"

if [[ "$deployed_url" != https://* ]]; then
  deployed_url="https://$deployed_url"
fi

if [[ "$deployed_url" != https://* ]]; then
  deployed_url="https://$deployed_url"
fi

echo "url=${deployed_url}" >> "$GITHUB_OUTPUT"
echo "Deployed URL: ${deployed_url}" >> "$GITHUB_STEP_SUMMARY"
