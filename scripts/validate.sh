#!/usr/bin/env bash
set -euo pipefail

npm test
npm run check
npm run build
npm run smoke
test -s /tmp/connector-plan-sandbox-smoke.md

echo "validate: connector-plan-sandbox passed"

