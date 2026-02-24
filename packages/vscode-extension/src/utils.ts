import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import * as vscode from "vscode";
import { slugify } from "./pure";

const showcaseWriteToDisk = process.env.CARTGUARD_DEMO_WRITE_TO_DISK === "1";
const showcaseResultsDirName = "_cartguard_in_memory_showcase";

export const openResult = async (
    title: string,
    payload: unknown,
    output: vscode.OutputChannel,
    workspaceRoot: string | undefined
): Promise<void> => {
    const text = JSON.stringify(payload, null, 2);
    output.appendLine(`[CartGuard] ${title}`);
    output.appendLine(text);

    if (showcaseWriteToDisk && workspaceRoot) {
        const dirPath = join(workspaceRoot, showcaseResultsDirName);
        await mkdir(dirPath, { recursive: true });
        const fileName = `${Date.now()}-${slugify(title)}.json`;
        const filePath = join(dirPath, fileName);
        await writeFile(filePath, `${text}\n`, "utf8");
        const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
        await vscode.window.showTextDocument(doc, { preview: false });
        return;
    }

    const doc = await vscode.workspace.openTextDocument({
        content: text,
        language: "json"
    });
    await vscode.window.showTextDocument(doc, { preview: false });
};

export const pickJsonFile = async (
    title: string
): Promise<string | undefined> => {
    const selected = await vscode.window.showOpenDialog({
        canSelectMany: false,
        filters: { JSON: ["json"] },
        openLabel: title
    });

    return selected?.[0]?.fsPath;
};
