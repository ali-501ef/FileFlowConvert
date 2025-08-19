#!/usr/bin/env bash
set -euo pipefail
export PYTHONPATH="${PYTHONPATH}:$(pwd)/server/.pydeps"
echo "PYTHONPATH=${PYTHONPATH}"
exec node dist/index.js