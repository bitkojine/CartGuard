import { readFile } from "node:fs/promises";

export const readJsonFile = async (path: string): Promise<unknown> => {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw) as unknown;
};

export const slugify = (value: string): string =>
    value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 48);
