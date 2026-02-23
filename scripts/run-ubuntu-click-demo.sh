#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker/ubuntu-click/docker-compose.yml"
CONTAINER_NAME="cartguard-ubuntu-click"
MODE="${1:-auto}"

cd "$ROOT_DIR"
docker compose -f "$COMPOSE_FILE" up --build -d

echo "Waiting for container to start..."
for _ in $(seq 1 120); do
  if docker inspect -f '{{.State.Running}}' "$CONTAINER_NAME" 2>/dev/null | grep -q true; then
    break
  fi
  sleep 1
done

if ! docker inspect -f '{{.State.Running}}' "$CONTAINER_NAME" 2>/dev/null | grep -q true; then
  echo "Container failed to start: $CONTAINER_NAME"
  exit 1
fi

echo "Starting slow slideshow demo inside container..."
if docker exec "$CONTAINER_NAME" bash -lc "test -f /tmp/cartguard-slow-demo.pid && kill -0 \$(cat /tmp/cartguard-slow-demo.pid) 2>/dev/null"; then
  echo "Slow slideshow demo is already running."
else
  if [ "$MODE" = "manual" ]; then
    DEMO_CMD="pnpm --filter cartguard-vscode-extension test:e2e:slow"
  else
    DEMO_CMD="pnpm --filter cartguard-vscode-extension test:e2e:slow:auto"
  fi
  docker exec "$CONTAINER_NAME" bash -lc "nohup bash -lc 'export DISPLAY=:1; cd /workspace; pnpm install --frozen-lockfile && pnpm build && $DEMO_CMD' > /tmp/cartguard-slow-demo.log 2>&1 < /dev/null & echo \$! > /tmp/cartguard-slow-demo.pid"
fi

echo
echo "Open in browser: http://localhost:6080"
echo "Check demo logs: docker exec $CONTAINER_NAME bash -lc 'tail -f /tmp/cartguard-slow-demo.log'"
echo "Mode: $MODE (use './scripts/run-ubuntu-click-demo.sh manual' for click-to-continue mode)"
