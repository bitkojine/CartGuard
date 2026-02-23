# CartGuard VS Code Extension (Developer Setup)

This repository contains the CartGuard monorepo. For day-to-day use, this README is focused on one goal: **run the VS Code extension locally**.

## Prerequisites

- Node.js `>=20`
- pnpm `9.15.4`
- VS Code desktop

## 5-Minute Local Setup

1. Clone and install dependencies:

```bash
git clone https://github.com/bitkojine/CartGuard.git
cd CartGuard
pnpm install --frozen-lockfile
```

2. Build the workspace (includes extension dependencies):

```bash
pnpm build
```

3. Package the extension as VSIX:

```bash
pnpm --filter cartguard-vscode-extension exec vsce package --no-dependencies -o packages/vscode-extension/cartguard.vsix
```

4. Install the extension into VS Code:

Option A (CLI):

```bash
code --install-extension packages/vscode-extension/cartguard.vsix --force
```

Option B (UI):
- Open VS Code
- Open Extensions view
- Click `...` -> `Install from VSIX...`
- Select `packages/vscode-extension/cartguard.vsix`

5. Open this folder in VS Code:

- `packages/vscode-extension/demo`

6. Run from Command Palette:

- `CartGuard: Run Demo`
- `CartGuard: Open Process View`
- `CartGuard: Open Slideshow Demo`

## Domain Model and Language (DDD)

This is the canonical problem-space language for CartGuard.  
Last updated from current research pass: `2026-02-23`.

### Product archetypes

- `non-radio mains`: non-radio electrical products in LVD voltage range.
- `battery non-radio`: non-radio electronic products, often EMC-relevant, sometimes outside LVD voltage scope.
- `radio-enabled`: products with intentional radio functions (Wi-Fi/Bluetooth/cellular), treated as RED scope.

### Rule source boundaries

- `legal`: obligations from harmonization legislation (for this domain, RED/LVD/EMC framing and required evidence structure).
- `marketplace`: operational platform requirements/workflows (for this domain, Amazon MYC/Account Health document-request flow).
- `recommendation`: CartGuard guidance and prioritization logic.
- `unknown`: explicit state when evidence or scope is insufficient for a safe automated conclusion.

### Core entities

- `Product`: a sellable SKU/model with archetype, attributes, and target market.
- `Listing`: channel-specific representation of product data (example: Amazon.de listing attributes).
- `EvidenceArtifact`: DoC, technical documentation index, test report metadata, manuals, labels, and related fields.
- `Rule`: machine-evaluable requirement record with trigger, checks, and confidence.
- `Finding`: rule evaluation output (`present`, `missing`, `mismatched`, `stale`, `unknown`, `not_applicable`) and blocking flag.
- `DecisionGate`: forced operator choice (`ship`, `hold`, `escalate`) with recommendation and tradeoff context.
- `RoleOutput`: role-specific action package for Ops, Compliance, Engineering, and Responsible Person.

### Ubiquitous terms

- `DoC`: EU Declaration of Conformity artifact.
- `Technical File`: living evidence package supporting conformity claims.
- `Traceability`: consistency of model identity and economic-operator identity across artifacts.
- `Applicability`: which instrument/rule set is expected for a product context.
- `Readiness`: pre-submission state combining legal evidence gaps and marketplace risk signal.

### Deterministic applicability logic in this model

- If product is `radio-enabled`, model expects RED-oriented evidence and treats safety/EMC expectations through RED context.
- If product is `non-radio mains`, model expects LVD/EMC-oriented evidence bundle.
- If product is `battery non-radio`, model expects EMC-oriented evidence and escalates edge cases where scope confidence is low.
- Where classification confidence is low, model must output `unknown` and route to human review.

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
- CartGuard must separate `legal`, `marketplace`, and `recommendation` in each meaningful finding.
- CartGuard must mark unsupported conclusions as `unknown` rather than over-assert.
- Gate outcomes are explicit and auditable (`ship`, `hold`, `escalate` + rationale).

## Extension Commands

- `CartGuard: Run Demo`
- `CartGuard: Validate JSON Files`
- `CartGuard: Open Process View`
- `CartGuard: Open Slideshow Demo`
- `CartGuard: Demo Next Step`
- `CartGuard: Reopen Slideshow Demo`

### What each command does

1. `CartGuard: Run Demo`
- Runs evaluation with default demo inputs.
- Opens JSON results in the editor.

2. `CartGuard: Validate JSON Files`
- Validates selected listing/rules/applicability JSON files.
- Opens JSON validation results.

3. `CartGuard: Open Process View`
- Runs evaluation and opens a process webview with summary + rule outcomes.

4. `CartGuard: Open Slideshow Demo`
- Opens the interactive step-by-step demo webview.
- Uses runtime data from `packages/vscode-extension/demo/slideshow.json` and `packages/vscode-extension/demo/workflow-batch.json`.

5. `CartGuard: Demo Next Step`
- Advances the slideshow one step.
- Auto-applies recommended gate decisions when needed in command-driven flow.

6. `CartGuard: Reopen Slideshow Demo`
- Resets and reopens the slideshow from step 1.

## Demo Data Files (Runtime)

The slideshow is file-driven:

- `packages/vscode-extension/demo/slideshow.json`
- `packages/vscode-extension/demo/workflow-batch.json`
- `packages/vscode-extension/demo/sample-listing.json`
- `packages/vscode-extension/demo/rules.json`
- `packages/vscode-extension/demo/applicability.json`

## E2E Demo Runs

Automated:

```bash
pnpm --filter cartguard-vscode-extension test:e2e
```

Slow/manual (click-through):

```bash
pnpm --filter cartguard-vscode-extension test:e2e:slow
```

## Troubleshooting

- `code: command not found`
  - Use VS Code UI install path (`Install from VSIX...`).

- `vsce` packaging fails
  - Re-run:
    ```bash
    pnpm install --frozen-lockfile
    pnpm --filter cartguard-vscode-extension build
    pnpm --filter cartguard-vscode-extension exec vsce package --no-dependencies -o packages/vscode-extension/cartguard.vsix
    ```

- CartGuard commands not visible
  - Confirm extension is installed (`@installed cartguard` in Extensions search).
  - Run `Developer: Reload Window`.
  - Confirm opened folder is `packages/vscode-extension/demo`.

## Optional Repository Checks

```bash
pnpm lint
pnpm guard
pnpm check
```

## License

MIT — see `LICENSE`.
