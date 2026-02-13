#!/usr/bin/env bash
# Fetch the latest OpenRouter model catalog and update the test fixture.
# Usage: ./scripts/update-openrouter-fixture.sh

set -euo pipefail

FIXTURE="packages/core/src/__fixtures__/openrouter-models.json"

echo "Fetching OpenRouter model catalog..."
curl -sf https://openrouter.ai/api/v1/models | python3 -c "
import sys, json
from datetime import datetime, timezone

data = json.load(sys.stdin)
models = data['data']

for m in models:
    m.pop('description', None)
    m.pop('default_parameters', None)
    m.pop('per_request_limits', None)

output = {
    'lastUpdated': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
    'data': models,
}

json.dump(output, sys.stdout, indent=2)
" > "$FIXTURE"

COUNT=$(python3 -c "import json; print(len(json.load(open('$FIXTURE'))['data']))")
echo "Saved $COUNT models to $FIXTURE"
echo "Last updated: $(python3 -c "import json; print(json.load(open('$FIXTURE'))['lastUpdated'])")"
