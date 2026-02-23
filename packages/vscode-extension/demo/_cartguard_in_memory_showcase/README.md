# In Memory Showcase Directory

This folder documents and hosts demo-only artifacts for the VSCode extension slideshow.

## What "in memory" means in CartGuard

In normal extension runs, results are created in memory and shown as unsaved editor tabs.
No result files are required on disk for product behavior.

## Which files are involved

### 1) Demo input files (tracked, real files)

These are the source inputs the demo evaluates:

- `../sample-listing.json`
- `../rules.json`
- `../applicability.json`

Why we need them:

- They define a deterministic scenario for E2E demos.
- They appear in the VSCode Explorer so demos are easy to follow.
- They represent the core domain objects: listing data, rule catalog, and applicability logic.

### 2) Demo result files (generated, untracked)

When showcase mode is enabled (`CARTGUARD_DEMO_WRITE_TO_DISK=1`), the extension writes result snapshots here, such as:

- `<timestamp>-demo-result.json`
- `<timestamp>-validation-result.json`

Why we need them:

- During slow-motion demos, viewers can see outputs as normal files in Explorer.
- It makes the workflow visual and inspectable step-by-step.

These files are deleted automatically after E2E runs and are git-ignored.

### 3) Pure in-memory result documents (not files)

Outside showcase mode, the extension opens JSON result tabs directly from memory via VSCode APIs.

Why we need this mode:

- Fast execution with zero disk writes.
- Closer to expected real runtime behavior.

## Why this directory exists

This folder is a demo bridge between real in-memory behavior and visual storytelling:

- product behavior: in-memory, fast, no persistent artifacts
- demo behavior: optional disk snapshots so stakeholders can watch the process in Explorer

## Repository policy

- Committed: this `README.md` only
- Not committed: generated demo JSON outputs
