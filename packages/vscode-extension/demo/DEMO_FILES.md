# Demo Files Guide

This document explains every file used in the VSCode extension demo workspace.

## Core input files

- `sample-listing.json`
  - Demo listing payload.
  - Represents the product/listing data that CartGuard validates.

- `rules.json`
  - Rule catalog for the demo.
  - Defines required evidence checks and status logic.

- `applicability.json`
  - Applicability rule set for the demo.
  - Determines which legal/policy rules apply to this listing context.

- `workflow-batch.json`
  - Real-workflow slideshow data pack (3 SKUs + scenario metadata).
  - Drives symptom-first manual demo steps, role ownership, fix actions, unknown escalation, false-alarm pass case, and role-specific output cards.

## Demo output folder

- `_cartguard_in_memory_showcase/`
  - Demo-only output area used in slow-motion showcase mode.
  - Contains generated result snapshots during a run when `CARTGUARD_DEMO_WRITE_TO_DISK=1`.
  - Generated JSON files are cleaned up after E2E runs.

## Why this workspace exists

The E2E demo opens this `demo/` folder as the test workspace so viewers can:

- see real input files in VSCode Explorer
- watch output snapshots appear during showcase runs
- understand the evaluation flow step-by-step
