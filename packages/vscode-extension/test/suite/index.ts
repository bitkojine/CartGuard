import { resolve } from "node:path";

import Mocha from "mocha";

export const run = async (): Promise<void> => {
  const holdOpenMs = Number(process.env.CARTGUARD_E2E_HOLD_OPEN_MS ?? "0");
  const stepMs = Number(process.env.CARTGUARD_E2E_STEP_MS ?? "0");
  const timeoutMs = holdOpenMs > 600000 ? 0 : Math.max(30000, holdOpenMs + stepMs * 20 + 30000);

  const mocha = new Mocha({
    ui: "tdd",
    color: true,
    timeout: timeoutMs
  });

  mocha.addFile(resolve(__dirname, "./extension.e2e.test.js"));
  mocha.addFile(resolve(__dirname, "./demo-data.e2e.test.js"));

  await new Promise<void>((resolvePromise, rejectPromise) => {
    mocha.run((failures) => {
      if (failures > 0) {
        rejectPromise(new Error(`${failures} test(s) failed.`));
        return;
      }

      resolvePromise();
    });
  });
};
