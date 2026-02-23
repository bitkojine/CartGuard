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

echo "Starting window maximizer helper..."
if docker exec "$CONTAINER_NAME" bash -lc "test -f /tmp/cartguard-window-maximizer.pid && kill -0 \$(cat /tmp/cartguard-window-maximizer.pid) 2>/dev/null"; then
  echo "Window maximizer helper is already running."
else
  docker exec "$CONTAINER_NAME" bash -lc "nohup bash -lc '
    export DISPLAY=:1
    for _ in \$(seq 1 600); do
      if command -v wmctrl >/dev/null 2>&1; then
        wmctrl -l 2>/dev/null | grep -E \"Extension Development Host|Visual Studio Code|Code - OSS\" | while read -r id _rest; do
          wmctrl -i -r \"\$id\" -b add,maximized_vert,maximized_horz >/dev/null 2>&1 || true
        done
      fi
      sleep 1
    done
  ' > /tmp/cartguard-window-maximizer.log 2>&1 < /dev/null & echo \$! > /tmp/cartguard-window-maximizer.pid"
fi

echo
echo "Open in browser: http://localhost:6080"
echo "Check demo logs: docker exec $CONTAINER_NAME bash -lc 'tail -f /tmp/cartguard-slow-demo.log'"
echo "Check maximizer logs: docker exec $CONTAINER_NAME bash -lc 'tail -f /tmp/cartguard-window-maximizer.log'"
echo "Mode: $MODE (use './scripts/run-ubuntu-click-demo.sh manual' for click-to-continue mode)"
