# No Code Comments Policy

Code and test files must not contain comments.

Rules:
- Do not use `// ...` comments.
- Do not use `/* ... */` comments.
- Do not use JSDoc blocks in code.

Where to put reasoning:
- Put technical rationale, tradeoffs, and implementation notes in `docs/`.
- If an AI agent wants to explain why a change was made, it must write or update a doc file instead of adding code comments.

Enforcement:
- Local pre-commit runs `pnpm guard`, which includes `guard:no-comments`.
- CI runs `pnpm guard` and fails on any comment found in tracked TypeScript code/test files.
