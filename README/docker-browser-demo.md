# Docker Browser Demo (Ubuntu + noVNC)

Use this when you want to simulate a fresh Ubuntu machine and run the VS Code demo in browser.

## Start

Auto-play mode (default):

```bash
./scripts/run-ubuntu-click-demo.sh
```

What this does:
- Starts the Ubuntu desktop container (no rebuild by default)
- Runs:
  - `pnpm install --frozen-lockfile`
  - `pnpm build`
  - `pnpm --filter cartguard-vscode-extension test:e2e:slow:auto`
- Waits for a real VS Code window before reporting ready
- Auto-clicks through decision gates and `Continue` until the final close step

Manual click mode:

```bash
./scripts/run-ubuntu-click-demo.sh manual
```

Force rebuild:

```bash
CARTGUARD_UBUNTU_CLICK_REBUILD=1 ./scripts/run-ubuntu-click-demo.sh
```

## Open in Browser

- Preferred: `https://localhost:8443`
- Fallback: `http://localhost:6080`

## Localhost HTTPS Setup

TLS is terminated locally so browser traffic is encrypted even on localhost.

- `cartguard-ubuntu-click` serves noVNC over HTTP on container `80` (host `6080`)
- `cartguard-novnc-https` (Caddy) serves HTTPS on host `8443` and proxies to `cartguard-ubuntu-click:80`
- Config:
  - `docker/ubuntu-click/Caddyfile`
  - `docker/ubuntu-click/docker-compose.yml`

First run note:
- Browser may show a trust warning because Caddy uses an internal localhost CA.

## Verify HTTPS

```bash
docker compose -f docker/ubuntu-click/docker-compose.yml ps
curl -k -I https://localhost:8443
```

Expected:
- `cartguard-ubuntu-click` and `cartguard-novnc-https` are running
- HTTPS returns success (for example `HTTP/2 200`)

## Logs

```bash
docker exec cartguard-ubuntu-click bash -lc 'tail -f /tmp/cartguard-slow-demo.log'
docker exec cartguard-ubuntu-click bash -lc 'tail -f /tmp/cartguard-vscode-startup-prep.log'
docker exec cartguard-ubuntu-click bash -lc 'tail -f /tmp/cartguard-window-maximizer.log'
```

## Stability Controls

- `CARTGUARD_VSCODE_READY_TIMEOUT_SECONDS` (default `180`): max wait for VS Code window readiness
- `CARTGUARD_DEMO_RETRY_MAX_ATTEMPTS` (default `3`): retries demo run after Electron/X crashes

## Stop

```bash
docker compose -f docker/ubuntu-click/docker-compose.yml down
```
