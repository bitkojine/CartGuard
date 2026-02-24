import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ZodError, ZodIssue } from "zod";
import {
  ResearchIndexSchema,
  ResearchFactCatalogSchema,
  ResearchPilotCatalogSchema
} from "../packages/spec/src/index.ts";

const docsDir = "docs/assets/research";

const readJson = (file: string): unknown => {
  const content = readFileSync(join(docsDir, file), "utf8");
  return JSON.parse(content) as unknown;
};

const violations: string[] = [];

const formatZodError = (error: ZodError, file: string): string[] => {
  return error.issues.map((issue: ZodIssue) => `${file}: ${issue.path.join(".")} - ${issue.message}`);
};

const indexRaw = readJson("index.json");
const factsRaw = readJson("facts.json");
const pilotsRaw = readJson("pilots.json");

const indexParsed = ResearchIndexSchema.safeParse(indexRaw);
if (!indexParsed.success) {
  violations.push(...formatZodError(indexParsed.error, "index.json"));
}

const factsParsed = ResearchFactCatalogSchema.safeParse(factsRaw);
if (!factsParsed.success) {
  violations.push(...formatZodError(factsParsed.error, "facts.json"));
}

const pilotsParsed = ResearchPilotCatalogSchema.safeParse(pilotsRaw);
if (!pilotsParsed.success) {
  violations.push(...formatZodError(pilotsParsed.error, "pilots.json"));
}

// Business logic checks (relationships)
const validIndexIds = new Set(indexParsed.success ? indexParsed.data.entries.map((e) => e.id) : []);

if (factsParsed.success) {
  for (const [index, fact] of factsParsed.data.facts.entries()) {
    if (!validIndexIds.has(fact.research_entry_id)) {
      violations.push(`facts.json: facts.${index}.research_entry_id not found in index.json: ${fact.research_entry_id}`);
    }
  }
}

if (pilotsParsed.success) {
  for (const [index, pilot] of pilotsParsed.data.pilots.entries()) {
    if (!validIndexIds.has(pilot.research_entry_id)) {
      violations.push(`pilots.json: pilots.${index}.research_entry_id not found in index.json: ${pilot.research_entry_id}`);
    }
  }
}


const factsCount = factsParsed.success ? factsParsed.data.facts.length : 0;
const pilotsCount = pilotsParsed.success ? pilotsParsed.data.pilots.length : 0;
const indexCount = indexParsed.success ? indexParsed.data.entries.length : 0;

if (indexParsed.success && indexCount === 0) {
  violations.push("index.json: must contain at least one index entry");
}

if (factsParsed.success && factsCount === 0) {
  violations.push("facts.json: must contain at least one fact entry");
}

if (pilotsParsed.success && pilotsCount === 0) {
  violations.push("pilots.json: must contain at least one pilot metric entry");
}

if (violations.length > 0) {
  console.error("Research data guard failed:");
  for (const violation of violations) {
    console.error(` - ${violation}`);
  }
  process.exit(1);
}

console.log(`OK: research data validated (${indexCount} index entries, ${factsCount} facts, ${pilotsCount} pilot rows).`);
