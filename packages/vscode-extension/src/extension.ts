import * as vscode from "vscode";
import { DemoManager } from "./demo-manager";
import { toPositiveInt } from "./extension-logic";
import { registerCommands } from "./commands";

export const activate = (context: vscode.ExtensionContext): void => {
  const output = vscode.window.createOutputChannel("CartGuard");
  const shouldCloseWindowOnDone = process.env.CARTGUARD_DEMO_CLOSE_WINDOW !== "0";
  const autoplayEnabled = process.env.CARTGUARD_DEMO_AUTOPLAY === "1";
  const autoplayStepMs = toPositiveInt(process.env.CARTGUARD_DEMO_AUTOPLAY_STEP_MS, 3000);

  const demoManager = new DemoManager(context, output, autoplayEnabled, autoplayStepMs);

  context.subscriptions.push(
    output,
    ...registerCommands(context, demoManager, output, { shouldCloseWindowOnDone })
  );
};
