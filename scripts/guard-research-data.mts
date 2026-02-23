import { readFileSync } from "node:fs";
import { join } from "node:path";

type JsonRecord = Record<string, unknown>;

type Confidence = "low" | "medium" | "high";

interface ResearchIndexEntry {
  id: string;
  title: string;
  confidence: Confidence;
  geography: string[];
  sources: string[];
}

interface ResearchFactEntry {
  id: string;
  date: string;
  geography: string;
  confidence: Confidence;
  source_url: string;
  claim: string;
  is_modeled: boolean;
  research_entry_id: string;
  signal: string;
  value: string;
}

interface PilotMetricEntry {
  id: string;
  pilot_label: string;
  metric: string;
  baseline: string;
  current: string;
  improvement: string;
  confidence: Confidence;
  status: "in_progress" | "completed";
  is_anonymized: boolean;
  research_entry_id: string;
}

const docsDir = "docs/assets/research";

const readJson = (file: string): unknown => {
  const content = readFileSync(join(docsDir, file), "utf8");
  return JSON.parse(content) as unknown;
};

const isRecord = (value: unknown): value is JsonRecord => typeof value === "object" && value !== null && !Array.isArray(value);

const isConfidence = (value: unknown): value is Confidence => value === "low" || value === "medium" || value === "high";

const isStringArray = (value: unknown): value is string[] => Array.isArray(value) && value.every((item) => typeof item === "string" && item.length > 0);

const isIsoDate = (value: string): boolean => /^\d{4}(-\d{2}-\d{2})?$/.test(value);

const isUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
};

const violations: string[] = [];

const indexRaw = readJson("index.json");
const factsRaw = readJson("facts.json");
const pilotsRaw = readJson("pilots.json");

const parseIndexEntries = (payload: unknown): ResearchIndexEntry[] => {
  if (!isRecord(payload) || !Array.isArray(payload.entries)) {
    violations.push("index.json: missing entries array");
    return [];
  }

  const out: ResearchIndexEntry[] = [];

  for (const entry of payload.entries) {
    if (!isRecord(entry)) {
      violations.push("index.json: entry must be an object");
      continue;
    }

    const { id, title, confidence, geography, sources } = entry;

    if (typeof id !== "string" || id.length === 0) {
      violations.push("index.json: entry.id must be a non-empty string");
      continue;
    }

    if (typeof title !== "string" || title.length === 0) {
      violations.push(`index.json: ${id} title must be non-empty`);
    }

    if (!isConfidence(confidence)) {
      violations.push(`index.json: ${id} confidence must be low|medium|high`);
    }

    if (!isStringArray(geography)) {
      violations.push(`index.json: ${id} geography must be a non-empty string array`);
    }

    if (!isStringArray(sources)) {
      violations.push(`index.json: ${id} sources must be a non-empty string array`);
    } else {
      for (const source of sources) {
        if (!isUrl(source)) {
          violations.push(`index.json: ${id} invalid source url: ${source}`);
        }
      }
    }

    if (typeof title === "string" && isConfidence(confidence) && isStringArray(geography) && isStringArray(sources)) {
      out.push({ id, title, confidence, geography, sources });
    }
  }

  return out;
};

const parseFacts = (payload: unknown, validResearchIds: Set<string>): ResearchFactEntry[] => {
  if (!isRecord(payload) || !Array.isArray(payload.facts)) {
    violations.push("facts.json: missing facts array");
    return [];
  }

  const out: ResearchFactEntry[] = [];

  for (const entry of payload.facts) {
    if (!isRecord(entry)) {
      violations.push("facts.json: fact must be an object");
      continue;
    }

    const { id, date, geography, confidence, source_url, claim, is_modeled, research_entry_id, signal, value } = entry;

    if (typeof id !== "string" || id.length === 0) {
      violations.push("facts.json: id must be a non-empty string");
      continue;
    }

    if (typeof date !== "string" || !isIsoDate(date)) {
      violations.push(`facts.json: ${id} date must be YYYY or YYYY-MM-DD`);
    }

    if (typeof geography !== "string" || geography.length === 0) {
      violations.push(`facts.json: ${id} geography must be non-empty`);
    }

    if (!isConfidence(confidence)) {
      violations.push(`facts.json: ${id} confidence must be low|medium|high`);
    }

    if (typeof source_url !== "string" || !isUrl(source_url)) {
      violations.push(`facts.json: ${id} source_url must be valid http/https URL`);
    }

    if (typeof claim !== "string" || claim.length === 0) {
      violations.push(`facts.json: ${id} claim must be non-empty`);
    }

    if (typeof signal !== "string" || signal.length === 0) {
      violations.push(`facts.json: ${id} signal must be non-empty`);
    }

    if (typeof value !== "string" || value.length === 0) {
      violations.push(`facts.json: ${id} value must be non-empty`);
    }

    if (typeof is_modeled !== "boolean") {
      violations.push(`facts.json: ${id} is_modeled must be boolean`);
    }

    if (typeof research_entry_id !== "string" || research_entry_id.length === 0) {
      violations.push(`facts.json: ${id} research_entry_id must be non-empty`);
    } else if (!validResearchIds.has(research_entry_id)) {
      violations.push(`facts.json: ${id} research_entry_id not found in index.json: ${research_entry_id}`);
    }

    if (
      typeof date === "string" &&
      isIsoDate(date) &&
      typeof geography === "string" &&
      isConfidence(confidence) &&
      typeof source_url === "string" &&
      isUrl(source_url) &&
      typeof claim === "string" &&
      typeof is_modeled === "boolean" &&
      typeof research_entry_id === "string" &&
      validResearchIds.has(research_entry_id) &&
      typeof signal === "string" &&
      typeof value === "string"
    ) {
      out.push({ id, date, geography, confidence, source_url, claim, is_modeled, research_entry_id, signal, value });
    }
  }

  return out;
};

const parsePilots = (payload: unknown, validResearchIds: Set<string>): PilotMetricEntry[] => {
  if (!isRecord(payload) || !Array.isArray(payload.pilots)) {
    violations.push("pilots.json: missing pilots array");
    return [];
  }

  const out: PilotMetricEntry[] = [];

  for (const entry of payload.pilots) {
    if (!isRecord(entry)) {
      violations.push("pilots.json: pilot row must be an object");
      continue;
    }

    const { id, pilot_label, metric, baseline, current, improvement, confidence, status, is_anonymized, research_entry_id } = entry;

    if (typeof id !== "string" || id.length === 0) {
      violations.push("pilots.json: id must be non-empty string");
      continue;
    }

    if (typeof pilot_label !== "string" || pilot_label.length === 0) {
      violations.push(`pilots.json: ${id} pilot_label must be non-empty`);
    }

    if (typeof metric !== "string" || metric.length === 0) {
      violations.push(`pilots.json: ${id} metric must be non-empty`);
    }

    if (typeof baseline !== "string" || baseline.length === 0) {
      violations.push(`pilots.json: ${id} baseline must be non-empty`);
    }

    if (typeof current !== "string" || current.length === 0) {
      violations.push(`pilots.json: ${id} current must be non-empty`);
    }

    if (typeof improvement !== "string" || improvement.length === 0) {
      violations.push(`pilots.json: ${id} improvement must be non-empty`);
    }

    if (!isConfidence(confidence)) {
      violations.push(`pilots.json: ${id} confidence must be low|medium|high`);
    }

    if (status !== "in_progress" && status !== "completed") {
      violations.push(`pilots.json: ${id} status must be in_progress|completed`);
    }

    if (typeof is_anonymized !== "boolean") {
      violations.push(`pilots.json: ${id} is_anonymized must be boolean`);
    }

    if (typeof research_entry_id !== "string" || research_entry_id.length === 0) {
      violations.push(`pilots.json: ${id} research_entry_id must be non-empty`);
    } else if (!validResearchIds.has(research_entry_id)) {
      violations.push(`pilots.json: ${id} research_entry_id not found in index.json: ${research_entry_id}`);
    }

    if (
      typeof pilot_label === "string" &&
      typeof metric === "string" &&
      typeof baseline === "string" &&
      typeof current === "string" &&
      typeof improvement === "string" &&
      isConfidence(confidence) &&
      (status === "in_progress" || status === "completed") &&
      typeof is_anonymized === "boolean" &&
      typeof research_entry_id === "string" &&
      validResearchIds.has(research_entry_id)
    ) {
      out.push({ id, pilot_label, metric, baseline, current, improvement, confidence, status, is_anonymized, research_entry_id });
    }
  }

  return out;
};

const indexEntries = parseIndexEntries(indexRaw);
const indexIds = new Set(indexEntries.map((entry) => entry.id));
const factEntries = parseFacts(factsRaw, indexIds);
const pilotEntries = parsePilots(pilotsRaw, indexIds);

if (factEntries.length === 0) {
  violations.push("facts.json: must contain at least one fact entry");
}

if (pilotEntries.length === 0) {
  violations.push("pilots.json: must contain at least one pilot metric entry");
}

if (violations.length > 0) {
  console.error("Research data guard failed:");
  for (const violation of violations) {
    console.error(` - ${violation}`);
  }
  process.exit(1);
}

console.log(`OK: research data validated (${indexEntries.length} index entries, ${factEntries.length} facts, ${pilotEntries.length} pilot rows).`);
