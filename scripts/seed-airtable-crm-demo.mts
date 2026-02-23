type RecordFields = Record<string, string | number>;

type AirtableListResponse = {
  records: Array<{ id: string; fields?: RecordFields }>;
  offset?: string;
};

const token = process.env.AIRTABLE_TOKEN;
const baseId = process.env.AIRTABLE_BASE_ID;

if (!token || !baseId) {
  console.error("Missing AIRTABLE_TOKEN or AIRTABLE_BASE_ID.");
  process.exit(1);
}

const baseUrl = `https://api.airtable.com/v0/${baseId}`;
const DEMO_ROWS_PER_TABLE = 50;

const countries = ["China", "Hong Kong", "India", "Other"];
const markets = ["Germany", "France", "Netherlands", "Poland", "Other"];
const verticals = ["Consumer Electronics", "Accessories", "Home Goods", "Other"];
const priorities = ["High", "Medium", "Low"];
const readinessStates = ["Not Ready", "Discovery", "Ready To Scope", "Ready To Start"];
const accountStatuses = ["Target", "Contacted", "Qualified", "Disqualified"];

const pilotStages = [
  "Candidate",
  "Qualified",
  "Scoped",
  "Commercial Proposed",
  "Active",
  "Completed Won",
  "Completed Lost",
  "On Hold"
];
const yesNo = ["Yes", "No"];
const riskLevels = ["Low", "Medium", "High"];
const renewalLikelihoods = ["High", "Medium", "Low"];
const exitStatuses = ["Open", "Converted", "Lost", "Extended"];
const riskCategories = ["Value Proof", "Budget Owner", "Integration", "False Positive", "Scope Drift", "Timing"];
const riskSeverities = ["Low", "Medium", "High", "Critical"];
const riskStatuses = ["Open", "Monitoring", "Closed"];
const evidenceTypes = ["Before Snapshot", "After Snapshot", "Customer Quote", "Decision Log", "Export"];
const evidenceConfidence = ["High", "Medium", "Low"];

const pad = (value: number): string => String(value).padStart(3, "0");

const pick = (values: string[], index: number): string => values[index % values.length]!;

const isoDate = (dayOffset: number): string => {
  const date = new Date(Date.UTC(2026, 1, 1 + dayOffset, 10, 0, 0));
  return date.toISOString().slice(0, 10);
};

const isoDateTime = (dayOffset: number): string => {
  const date = new Date(Date.UTC(2026, 1, 1 + dayOffset, 10, 0, 0));
  return date.toISOString();
};

const accountName = (index: number): string => `Demo Account ${pad(index + 1)}`;
const pilotId = (index: number): string => `PILOT-${pad(index + 1)}`;

const accountRows: RecordFields[] = Array.from({ length: DEMO_ROWS_PER_TABLE }, (_, i) => ({
  "Account Name": accountName(i),
  "Country Origin": pick(countries, i),
  "Target EU Market": pick(markets, i),
  Vertical: pick(verticals, i),
  "ICP Fit": (i % 5) + 1,
  "Pilot Priority": pick(priorities, i),
  "Pilot Readiness": pick(readinessStates, i),
  "Current Pilot ID": pilotId(i),
  Website: `https://example.com/account-${pad(i + 1)}`,
  Status: pick(accountStatuses, i),
  Owner: i % 2 === 0 ? "sales-1" : "sales-2",
  Notes: "APAC-to-EU account focused on paid pilot readiness."
}));

const pilotRows: RecordFields[] = Array.from({ length: DEMO_ROWS_PER_TABLE }, (_, i) => ({
  "Pilot ID": pilotId(i),
  "Account Name": accountName(i),
  Stage: pick(pilotStages, i),
  "Pilot Fee EUR": 3000 + i * 125,
  "Pilot Start Date": isoDate(i % 40),
  "Pilot Target End Date": isoDate((i % 40) + 14),
  "Budget Owner": i % 2 === 0 ? "EU Ops Lead" : "Marketplace Director",
  Champion: i % 2 === 0 ? "Compliance Manager" : "Catalog Lead",
  "Success Plan Signed": pick(yesNo, i),
  "Baseline Missing Doc Rate": 22 - (i % 8),
  "Current Missing Doc Rate": 16 - (i % 8),
  "Baseline Review Hours": 28 + (i % 10),
  "Current Review Hours": 18 + (i % 8),
  "Baseline Rework Loops": 6 + (i % 4),
  "Current Rework Loops": 3 + (i % 3),
  "Renewal Likelihood": pick(renewalLikelihoods, i),
  "Pilot Exit Status": pick(exitStatuses, i),
  "Main Pain": "Listings delayed because EU-required documents are missing.",
  "Pilot Scope": "Germany electronics listing checks before publish.",
  "Next Exec Step": "Weekly review with customer ops and compliance owners.",
  "Next Exec Due": isoDate((i % 35) + 2),
  "Risk Level": pick(riskLevels, i),
  "Outcome Score": (i % 10) + 1
}));

const reviewRows: RecordFields[] = Array.from({ length: DEMO_ROWS_PER_TABLE }, (_, i) => ({
  "Review ID": `REVIEW-${pad(i + 1)}`,
  "Pilot ID": pilotId(i),
  "Review Date": isoDateTime(i % 35),
  "Week Number": (i % 6) + 1,
  "Missing Doc Delta": -1 * ((i % 3) + 1),
  "Review Hours Delta": -1 * ((i % 4) + 1),
  "Rework Delta": -1 * ((i % 2) + 1),
  "Customer Present": pick(yesNo, i),
  Blockers: i % 4 === 0 ? "Waiting for importer document upload." : "None",
  Decisions: "Prioritize missing DoC and labeling evidence this week.",
  Owner: i % 2 === 0 ? "pilot-manager-1" : "pilot-manager-2"
}));

const riskRows: RecordFields[] = Array.from({ length: DEMO_ROWS_PER_TABLE }, (_, i) => ({
  "Risk ID": `RISK-${pad(i + 1)}`,
  "Pilot ID": pilotId(i),
  "Risk Category": pick(riskCategories, i),
  Severity: pick(riskSeverities, i),
  Status: pick(riskStatuses, i),
  Mitigation: "Run focused action plan with named owner and due date.",
  "Due Date": isoDate((i % 25) + 3),
  Owner: i % 2 === 0 ? "pilot-manager-1" : "pilot-manager-2"
}));

const evidenceRows: RecordFields[] = Array.from({ length: DEMO_ROWS_PER_TABLE }, (_, i) => ({
  "Evidence ID": `EVID-${pad(i + 1)}`,
  "Pilot ID": pilotId(i),
  "Evidence Type": pick(evidenceTypes, i),
  "Evidence Link": `https://example.com/evidence/${pad(i + 1)}`,
  Confidence: pick(evidenceConfidence, i),
  Summary: "Evidence artifact supporting pilot KPI movement.",
  "Collected At": isoDateTime((i % 40) + 1),
  Owner: i % 2 === 0 ? "analyst-1" : "analyst-2"
}));

const tableConfig = [
  { table: "Accounts", keyField: "Account Name", rows: accountRows },
  { table: "Pilots", keyField: "Pilot ID", rows: pilotRows },
  { table: "Pilot Reviews", keyField: "Review ID", rows: reviewRows },
  { table: "Pilot Risks", keyField: "Risk ID", rows: riskRows },
  { table: "Pilot Evidence", keyField: "Evidence ID", rows: evidenceRows }
];

const authHeaders = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json"
};

const listAllRecords = async (table: string): Promise<Array<{ id: string; fields?: RecordFields }>> => {
  const records: Array<{ id: string; fields?: RecordFields }> = [];
  let offset: string | undefined;

  do {
    const query = offset ? `?offset=${encodeURIComponent(offset)}` : "";
    const response = await fetch(`${baseUrl}/${encodeURIComponent(table)}${query}`, {
      headers: authHeaders
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to list records for ${table}: ${response.status} ${text}`);
    }

    const payload = (await response.json()) as AirtableListResponse;
    records.push(...payload.records);
    offset = payload.offset;
  } while (offset);

  return records;
};

const createRecords = async (table: string, rows: RecordFields[]): Promise<void> => {
  const chunkSize = 10;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize).map((fields) => ({ fields }));
    const response = await fetch(`${baseUrl}/${encodeURIComponent(table)}`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ records: chunk })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to create records for ${table}: ${response.status} ${text}`);
    }
  }
};

const main = async (): Promise<void> => {
  for (const config of tableConfig) {
    const existingRecords = await listAllRecords(config.table);
    const existingKeys = new Set<string>();
    for (const record of existingRecords) {
      const value = record.fields?.[config.keyField];
      if (typeof value === "string" && value.trim().length > 0) {
        existingKeys.add(value);
      }
    }

    const missingRows = config.rows.filter((row) => {
      const keyValue = row[config.keyField];
      return typeof keyValue === "string" && !existingKeys.has(keyValue);
    });

    if (missingRows.length === 0) {
      console.log(`No new demo rows needed for ${config.table}.`);
      continue;
    }

    await createRecords(config.table, missingRows);
    console.log(`Created ${missingRows.length} demo row(s) in ${config.table}.`);
  }

  console.log("Demo CRM seed complete.");
};

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
