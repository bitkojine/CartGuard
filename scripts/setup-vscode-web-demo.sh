#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${1:-}"
if [[ -z "${REPO_ROOT}" ]]; then
  echo "Usage: $0 <repo-root>"
  exit 1
fi

cd "${REPO_ROOT}"

if command -v corepack >/dev/null 2>&1; then
  corepack enable
fi
pnpm install --frozen-lockfile
pnpm --filter cartguard-vscode-extension build
pnpm --filter cartguard-vscode-extension exec vsce package --no-dependencies -o /tmp/cartguard.vsix

if command -v code >/dev/null 2>&1; then
  code --install-extension /tmp/cartguard.vsix --force
else
  echo "VS Code CLI not found; install /tmp/cartguard.vsix manually from Extensions view."
fi

echo "CartGuard demo setup complete."
echo "Open Command Palette and run: CartGuard: Open Slideshow Demo"
