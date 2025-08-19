#!/usr/bin/env bash
set -euo pipefail
echo "➡️  Node build"
npm run build
echo "➡️  Installing Python deps into server/.pydeps"
python3 -m pip install --upgrade pip wheel setuptools
python3 -m pip install -r server/requirements.txt --target server/.pydeps
echo "✅ render-build done"