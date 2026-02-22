#!/usr/bin/env node

import { runCli } from "../index.js";

const main = async (): Promise<void> => {
  try {
    const code = await runCli(process.argv.slice(2));
    process.exit(code);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`CartGuard CLI error: ${message}`);
    process.exit(1);
  }
};

void main();
