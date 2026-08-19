#!/usr/bin/env bash
set -euo pipefail

npm run release:check
test -s /tmp/connector-plan-sandbox-smoke.md

echo "validate: connector-plan-sandbox passed"
