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
const accountStatuses = ["Target", "Contacted", "Qualified", "Disqualified"];

const pilotStages = ["Candidate", "Qualified", "Scoped", "Active", "Completed Won", "Completed Lost", "On Hold"];
const exitStatuses = ["Open", "Converted", "Lost", "Extended"];
const noteTypes = ["Review", "Risk", "Evidence", "Decision"];
const priorities = ["High", "Medium", "Low"];

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
  Website: `https://example.com/account-${pad(i + 1)}`,
  Status: pick(accountStatuses, i),
  Owner: i % 2 === 0 ? "sales-1" : "sales-2",
  Notes: "Pilot-focused account."
}));

const pilotRows: RecordFields[] = Array.from({ length: DEMO_ROWS_PER_TABLE }, (_, i) => ({
  "Pilot ID": pilotId(i),
  "Account Name": accountName(i),
  Stage: pick(pilotStages, i),
  "Pilot Fee EUR": 3000 + i * 125,
  "Pilot Start Date": isoDate(i % 35),
  "Pilot Target End Date": isoDate((i % 35) + 14),
  "Baseline Missing Doc Rate": 24 - (i % 8),
  "Current Missing Doc Rate": 18 - (i % 8),
  "Next Exec Step": "Collect missing EU document evidence from customer.",
  "Next Exec Due": isoDate((i % 30) + 2),
  "Pilot Exit Status": pick(exitStatuses, i)
}));

const noteRows: RecordFields[] = Array.from({ length: DEMO_ROWS_PER_TABLE }, (_, i) => ({
  "Note ID": `NOTE-${pad(i + 1)}`,
  "Pilot ID": pilotId(i),
  "Note Type": pick(noteTypes, i),
  "Note Date": isoDateTime(i % 30),
  Owner: i % 2 === 0 ? "pilot-lead-1" : "pilot-lead-2",
  Summary: "Pilot execution note with action or evidence update.",
  Link: `https://example.com/pilot-note/${pad(i + 1)}`,
  Priority: pick(priorities, i)
}));

const tableConfig = [
  { table: "Accounts", keyField: "Account Name", rows: accountRows },
  { table: "Pilots", keyField: "Pilot ID", rows: pilotRows },
  { table: "Pilot Notes", keyField: "Note ID", rows: noteRows }
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
