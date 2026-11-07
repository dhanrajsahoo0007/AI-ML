#!/usr/bin/env bash
# Runs the visual snapshots (Playwright project `visual`) in the official Playwright Linux image, the same
# image the CI `visual` job uses, so screenshots match CI pixel for pixel. Baselines are only ever made here or
# in CI, never by a browser on macOS or Windows.
#
#   APP_ENV=production npm run build     # baselines are of the production profile (home counts differ by profile)
#   npm run e2e:visual -w web            # compare against the committed baselines
#   npm run e2e:visual:update -w web     # rewrite the baselines, then review and commit the PNGs
#
# The production server runs on this machine (`next start`); only the browser runs in Docker. Extra arguments
# go to `playwright test`.
set -euo pipefail

web_dir="$(cd "$(dirname "$0")/../.." && pwd)"
repo_dir="$(cd "$web_dir/../.." && pwd)"
port="${E2E_PORT:-3100}"
pw_version="$(node -p "require('@playwright/test/package.json').version")"
image="mcr.microsoft.com/playwright:v${pw_version}-noble"

cd "$web_dir"
if ! curl -sf -o /dev/null "http://127.0.0.1:${port}"; then
  npx next start -p "$port" >/dev/null 2>&1 &
  server_pid=$!
  trap 'kill "$server_pid" 2>/dev/null || true' EXIT
  for _ in $(seq 1 60); do
    curl -sf -o /dev/null "http://127.0.0.1:${port}" && break
    sleep 1
  done
fi

docker run --rm --platform linux/amd64 --ipc=host \
  --add-host=host.docker.internal:host-gateway \
  -v "$repo_dir:/work" -w /work/apps/web \
  -e E2E_BASE_URL="http://host.docker.internal:${port}" \
  "$image" npx playwright test --project=visual "$@"
