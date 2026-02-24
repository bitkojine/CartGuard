# CartGuard

## Part 1: VS Code Extension (Local Developer Setup)

This top section is only about running the CartGuard VS Code extension locally.

### Prerequisites

- Node.js `>=20`
- pnpm `9.15.4`
- VS Code desktop

### 5-Minute Setup

1. Clone and install:

```bash
git clone https://github.com/bitkojine/CartGuard.git
cd CartGuard
pnpm install --frozen-lockfile
```

2. Build workspace:

```bash
pnpm build
```

3. Package extension:

```bash
pnpm --filter cartguard-vscode-extension exec vsce package --no-dependencies -o cartguard.vsix
```

4. Install extension:

Option A (CLI):

```bash
code --install-extension packages/vscode-extension/cartguard.vsix --force
```

Option B (VS Code UI):
- Open Extensions view
- Click `...` -> `Install from VSIX...`
- Select `packages/vscode-extension/cartguard.vsix`

5. Open this folder in VS Code:
- `packages/vscode-extension/demo`

6. Run:
- `CartGuard: Run Demo`
- `CartGuard: Open Process View`
- `CartGuard: Open Slideshow Demo`

### Primary Demo Mode (after setup): Manual Click-to-Continue

Use this as the main walkthrough mode once setup is complete.

From repo root:

```bash
pnpm --filter cartguard-vscode-extension test:e2e:slow
```

What this does:
- Builds the extension
- Opens an Extension Development Host window
- Opens the slideshow demo
- Waits for manual `Continue` clicks
- Keeps VS Code open for live walkthrough

How to continue slides:
- Click `Continue` inside the slideshow webview, or
- Use command palette command: `CartGuard: Demo Next Step`

How to finish:
- Continue through all steps until the final action (the host closes at the end), or
- Stop from terminal with `Ctrl+C` if you want to exit early.

### Literal Clicks in Fresh Ubuntu (Docker + Browser Desktop)

Use this when you want to simulate a fresh Ubuntu machine and physically click every slideshow step.

1. Start everything with one command (auto-play mode by default):

```bash
./scripts/run-ubuntu-click-demo.sh
```

What this script now does automatically:
- Starts the Ubuntu desktop container (no rebuild by default)
- Runs:
  - `pnpm install --frozen-lockfile`
  - `pnpm build`
  - `pnpm --filter cartguard-vscode-extension test:e2e:slow:auto`
- Waits for a real VS Code window before reporting ready
- Auto-clicks through decision gates and `Continue` until the final close step

If you need to force a fresh image rebuild:

```bash
CARTGUARD_UBUNTU_CLICK_REBUILD=1 ./scripts/run-ubuntu-click-demo.sh
```

Manual click mode (optional):

```bash
./scripts/run-ubuntu-click-demo.sh manual
```

2. Open browser desktop:
- Preferred: `https://localhost:8443`
- Fallback: `http://localhost:6080`

Note:
- `https://localhost:8443` is encrypted via a local Caddy reverse proxy.
- You may see a browser trust warning the first time because Caddy uses a local internal CA for localhost certificates.

#### Localhost HTTPS setup (how it works)

We intentionally terminate TLS even for localhost so demo traffic in browser is encrypted.

- `cartguard-ubuntu-click` serves noVNC over plain HTTP on container port `80` (mapped to host `6080`).
- `cartguard-novnc-https` (Caddy) terminates HTTPS on host `8443` and reverse proxies to `cartguard-ubuntu-click:80`.
- Caddy config is in:
  - `docker/ubuntu-click/Caddyfile`
- Compose wiring is in:
  - `docker/ubuntu-click/docker-compose.yml`

Quick verification:

```bash
docker compose -f docker/ubuntu-click/docker-compose.yml ps
curl -k -I https://localhost:8443
```

Expected:
- Both services are running (`cartguard-ubuntu-click` and `cartguard-novnc-https`).
- HTTPS endpoint returns an HTTP success response (for example `HTTP/2 200`).

3. In the Extension Development Host window:
- Auto mode: watch it advance all slides and close at the finish line.
- Manual mode: click `Continue` manually for every step.

4. Optional: watch demo logs from host terminal:

```bash
docker exec cartguard-ubuntu-click bash -lc 'tail -f /tmp/cartguard-slow-demo.log'
```

Additional useful logs:

```bash
docker exec cartguard-ubuntu-click bash -lc 'tail -f /tmp/cartguard-vscode-startup-prep.log'
docker exec cartguard-ubuntu-click bash -lc 'tail -f /tmp/cartguard-window-maximizer.log'
```

Stability controls (optional environment variables):

- `CARTGUARD_VSCODE_READY_TIMEOUT_SECONDS` (default `180`): max wait for VS Code window readiness.
- `CARTGUARD_DEMO_RETRY_MAX_ATTEMPTS` (default `3`): retries the slow demo command if Electron/X crashes.

5. Stop container when done:

```bash
docker compose -f docker/ubuntu-click/docker-compose.yml down
```

### Extension Commands

- `CartGuard: Run Demo`
- `CartGuard: Validate JSON Files`
- `CartGuard: Open Process View`
- `CartGuard: Open Slideshow Demo`
- `CartGuard: Demo Next Step`
- `CartGuard: Reopen Slideshow Demo`

### Command Behavior

1. `CartGuard: Run Demo`
- Runs evaluation with default demo inputs.
- Opens JSON result output.

2. `CartGuard: Validate JSON Files`
- Validates selected listing/rules/applicability JSON files.
- Opens JSON validation output.

3. `CartGuard: Open Process View`
- Runs evaluation and opens summary/rule outcomes in a webview.

4. `CartGuard: Open Slideshow Demo`
- Opens the interactive step-by-step demo webview.
- Reads runtime data from demo JSON files.

5. `CartGuard: Demo Next Step`
- Advances slideshow by one step.
- Auto-applies recommended gate decisions for command-driven flow.

6. `CartGuard: Reopen Slideshow Demo`
- Resets and reopens slideshow from step 1.

### Runtime Demo Files

- `packages/vscode-extension/demo/slideshow.json`
- `packages/vscode-extension/demo/workflow-batch.json`
- `packages/vscode-extension/demo/sample-listing.json`
- `packages/vscode-extension/demo/rules.json`
- `packages/vscode-extension/demo/applicability.json`

### E2E Demo Runs

Automated:

```bash
pnpm --filter cartguard-vscode-extension test:e2e
```

Slow/manual:

```bash
pnpm --filter cartguard-vscode-extension test:e2e:slow
```

### Troubleshooting

- `code: command not found`
  - Use VS Code UI install path (`Install from VSIX...`).

- `vsce` packaging fails
  - Re-run:
    ```bash
    pnpm install --frozen-lockfile
    pnpm --filter cartguard-vscode-extension build
    pnpm --filter cartguard-vscode-extension exec vsce package --no-dependencies -o cartguard.vsix
    ```

- CartGuard commands not visible
  - Confirm extension is installed (`@installed cartguard`).
  - Run `Developer: Reload Window`.
  - Confirm folder is `packages/vscode-extension/demo`.

### Optional Repo Checks

```bash
pnpm lint
pnpm guard
pnpm check
```

## Part 2: Domain Model and Language (DDD)

Canonical problem-space language for CartGuard.  
Last updated from current research pass: `2026-02-23`.

### Product archetypes

- `non-radio mains`: non-radio electrical products in LVD voltage range.
- `battery non-radio`: non-radio electronic products, often EMC-relevant, sometimes outside LVD voltage scope.
- `radio-enabled`: products with intentional radio functions (Wi-Fi/Bluetooth/cellular), treated as RED scope.

### Rule source boundaries

- `legal`: obligations from harmonization legislation (RED/LVD/EMC framing and evidence expectations).
- `marketplace`: operational platform workflows (Amazon MYC/Account Health document-request flow).
- `recommendation`: CartGuard guidance and prioritization logic.
- `unknown`: explicit state when evidence or scope is insufficient for safe automated conclusion.

### Core entities

- `Product`: sellable SKU/model with archetype, attributes, and target market.
- `Listing`: channel-specific representation of product data (example: Amazon.de attributes).
- `EvidenceArtifact`: DoC, technical documentation index, test metadata, manuals, labels.
- `Rule`: machine-evaluable requirement record with trigger, checks, and confidence.
- `Finding`: evaluation output (`present`, `missing`, `mismatched`, `stale`, `unknown`, `not_applicable`) + blocking flag.
- `DecisionGate`: forced choice (`ship`, `hold`, `escalate`) with recommendation and tradeoff context.
- `RoleOutput`: role-specific action package for Ops, Compliance, Engineering, Responsible Person.

### Ubiquitous terms

- `DoC`: EU Declaration of Conformity.
- `Technical File`: living evidence package supporting conformity claims.
- `Traceability`: consistency of model identity and economic-operator identity across artifacts.
- `Applicability`: expected instrument/rule set for product context.
- `Readiness`: pre-submission state combining legal evidence gaps and marketplace risk signal.

### Deterministic applicability logic in this model

- `radio-enabled` -> expects RED-oriented evidence and RED-context safety/EMC expectations.
- `non-radio mains` -> expects LVD/EMC-oriented evidence bundle.
- `battery non-radio` -> expects EMC-oriented evidence and escalates low-confidence scope edges.
- Low confidence classification -> output `unknown` and route to human review.

### Minimum evidence model

- Product identity and traceability fields.
- Applicable rules/standards references.
- Risk/safety information and user instruction coverage (including destination language checks where modeled).
- Test/report references and critical evidence links.
- Label and economic-operator consistency fields.

### Responsibilities modeled

- `manufacturer`: primary owner of technical documentation and DoC production.
- `importer` / `responsible person`: traceability and authority-response readiness owner in workflow handoff.
- `ops`: listing readiness and submission timing owner.
- `compliance`: rule interpretation, approval, and escalations owner.
- `engineering`: data/feed consistency owner across listing and evidence metadata.

### Decision policy

- CartGuard does not make legal determinations.
- CartGuard must separate `legal`, `marketplace`, and `recommendation` in meaningful findings.
- CartGuard must mark unsupported conclusions as `unknown` rather than over-assert.
- Gate outcomes are explicit and auditable (`ship`, `hold`, `escalate` + rationale).

## License

MIT — see `LICENSE`.
