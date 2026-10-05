#!/usr/bin/env bash
# Builds a single-file HTML demo of agent-party from the mod's own art: demo/build.sh <out.html>
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
out="${1:-$here/agent-party-demo.html}"
bundle=$(npx -y esbuild@0.24.2 "$here/entry.ts" --bundle --format=iife --global-name=Party --minify --log-level=warning)
node -e '
const fs = require("fs")
const [tpl, out] = process.argv.slice(1)
fs.writeFileSync(out, fs.readFileSync(tpl, "utf8").replace("/*PARTY_BUNDLE*/", () => fs.readFileSync(0, "utf8")))
' "$here/template.html" "$out" <<< "$bundle"
echo "$out"
