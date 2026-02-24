#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker/ubuntu-click/docker-compose.yml"
CONTAINER_NAME="cartguard-ubuntu-click"
MODE="${1:-auto}"
REBUILD="${CARTGUARD_UBUNTU_CLICK_REBUILD:-0}"
READY_TIMEOUT_SECONDS="${CARTGUARD_VSCODE_READY_TIMEOUT_SECONDS:-180}"
DEMO_RETRY_MAX_ATTEMPTS="${CARTGUARD_DEMO_RETRY_MAX_ATTEMPTS:-3}"

cd "$ROOT_DIR"
if [ "$REBUILD" = "1" ]; then
  docker compose -f "$COMPOSE_FILE" up --build -d
else
  docker compose -f "$COMPOSE_FILE" up -d
fi

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

echo "Skipping explicit GUI socket wait; starting demo workers immediately."

echo "Starting slow slideshow demo inside container..."
if docker exec "$CONTAINER_NAME" bash -lc "test -f /tmp/cartguard-slow-demo.pid && kill -0 \$(cat /tmp/cartguard-slow-demo.pid) 2>/dev/null"; then
  echo "Slow slideshow demo is already running."
else
  if [ "$MODE" = "manual" ]; then
    DEMO_CMD="pnpm --filter cartguard-vscode-extension test:e2e:slow"
  else
    DEMO_CMD="pnpm --filter cartguard-vscode-extension test:e2e:slow:auto"
  fi
  docker exec \
    -e DISPLAY=:1 \
    -e CARTGUARD_DEMO_RETRY_MAX_ATTEMPTS="$DEMO_RETRY_MAX_ATTEMPTS" \
    "$CONTAINER_NAME" \
    bash -lc "nohup bash -lc '
      cd /workspace
      attempt=1
      max=\${CARTGUARD_DEMO_RETRY_MAX_ATTEMPTS:-3}
      while [ \"\$attempt\" -le \"\$max\" ]; do
        pnpm install --frozen-lockfile && pnpm build && $DEMO_CMD && exit 0
        code=\$?
        echo \"[demo-runner] attempt \$attempt failed with exit code \$code\"
        attempt=\$((attempt + 1))
        sleep 3
      done
      echo \"[demo-runner] all retry attempts failed\"
      exit \$code
    ' > /tmp/cartguard-slow-demo.log 2>&1 < /dev/null & echo \$! > /tmp/cartguard-slow-demo.pid"
fi

echo "Starting window maximizer helper..."
if docker exec "$CONTAINER_NAME" bash -lc "test -f /tmp/cartguard-window-maximizer.pid && kill -0 \$(cat /tmp/cartguard-window-maximizer.pid) 2>/dev/null"; then
  echo "Window maximizer helper is already running."
else
  docker exec -e DISPLAY=:1 "$CONTAINER_NAME" bash -lc "nohup bash -lc '
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

echo "Starting VS Code startup prep helper (reload + close panels)..."
if docker exec "$CONTAINER_NAME" bash -lc "test -f /tmp/cartguard-vscode-startup-prep.pid && kill -0 \$(cat /tmp/cartguard-vscode-startup-prep.pid) 2>/dev/null"; then
  echo "VS Code startup prep helper is already running."
else
  docker exec -e DISPLAY=:1 "$CONTAINER_NAME" bash -lc "nohup bash -lc '
    set -euo pipefail
    echo \"[startup-prep] helper started\"
    find_code_window() {
      wmctrl -l 2>/dev/null | grep -E \"Extension Development Host|Visual Studio Code|Code - OSS\" | head -n1 || true
    }
    run_vscode_command() {
      local cmd_id=\"\$1\"
      echo \"[startup-prep] run command: \$cmd_id\"
      code --command \"\$cmd_id\" >/dev/null 2>&1 || true
    }
    for _ in \$(seq 1 180); do
      win_line=\"\$(find_code_window)\"
      if [ -n \"\$win_line\" ]; then
        echo \"[startup-prep] detected VS Code window: \$win_line\"
        run_vscode_command \"workbench.action.closeAuxiliaryBar\"
        sleep 1
        run_vscode_command \"workbench.action.closePanel\"
        sleep 1
        run_vscode_command \"workbench.view.explorer\"
        echo \"[startup-prep] completed\"
        exit 0
      fi
      sleep 1
    done
    echo \"[startup-prep] timeout waiting for VS Code window\"
    exit 0
  ' > /tmp/cartguard-vscode-startup-prep.log 2>&1 < /dev/null & echo \$! > /tmp/cartguard-vscode-startup-prep.pid"
fi

echo "Waiting for VS Code window to be ready..."
vscode_ready=0
for _ in $(seq 1 "$READY_TIMEOUT_SECONDS"); do
  if docker exec -e DISPLAY=:1 "$CONTAINER_NAME" bash -lc "wmctrl -l 2>/dev/null | grep -qE 'Extension Development Host|Visual Studio Code|Code - OSS'"; then
    vscode_ready=1
    break
  fi
  sleep 1
done

if [ "$vscode_ready" -ne 1 ]; then
  echo "Error: VS Code window did not appear within ${READY_TIMEOUT_SECONDS}s."
  echo "Recent slow demo log:"
  docker exec "$CONTAINER_NAME" bash -lc "tail -n 80 /tmp/cartguard-slow-demo.log 2>/dev/null || true"
  echo "Recent startup-prep log:"
  docker exec "$CONTAINER_NAME" bash -lc "tail -n 80 /tmp/cartguard-vscode-startup-prep.log 2>/dev/null || true"
  exit 1
fi

echo "VS Code window detected."

echo
echo "Open in browser (HTTPS): https://localhost:8443"
echo "Fallback (HTTP): http://localhost:6080"
echo "Check demo logs: docker exec $CONTAINER_NAME bash -lc 'tail -f /tmp/cartguard-slow-demo.log'"
echo "Check maximizer logs: docker exec $CONTAINER_NAME bash -lc 'tail -f /tmp/cartguard-window-maximizer.log'"
echo "Check startup-prep logs: docker exec $CONTAINER_NAME bash -lc 'tail -f /tmp/cartguard-vscode-startup-prep.log'"
echo "Mode: $MODE (use './scripts/run-ubuntu-click-demo.sh manual' for click-to-continue mode)"
