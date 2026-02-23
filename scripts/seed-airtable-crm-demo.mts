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
const stages = ["Lead", "Qualified", "Discovery Done", "Pilot Proposed", "Pilot Active", "Won", "Lost"];
const risks = ["Low", "Medium", "High"];
const activityTypes = ["Outreach", "Call", "Follow-up", "Pilot Review"];

const pad = (value: number): string => String(value).padStart(3, "0");

const pick = (values: string[], index: number): string => values[index % values.length]!;

const isoDay = (dayOffset: number): string => {
  const date = new Date(Date.UTC(2026, 1, 23 + dayOffset, 10, 0, 0));
  return date.toISOString();
};

const accountRows: RecordFields[] = Array.from({ length: DEMO_ROWS_PER_TABLE }, (_, i) => {
  const n = i + 1;
  return {
    "Account Name": `Demo Account ${pad(n)}`,
    "Country Origin": pick(countries, i),
    "Target EU Market": pick(markets, i),
    Vertical: pick(verticals, i),
    "ICP Fit": (i % 5) + 1,
    Website: `https://example.com/account-${pad(n)}`,
    Status: pick(accountStatuses, i),
    Owner: i % 2 === 0 ? "sales-1" : "sales-2",
    Notes: `Demo account ${pad(n)} for CRM pipeline testing.`
  };
});

const dealRows: RecordFields[] = Array.from({ length: DEMO_ROWS_PER_TABLE }, (_, i) => {
  const n = i + 1;
  return {
    "Deal Name": `Demo Deal ${pad(n)}`,
    Stage: pick(stages, i),
    "Value EUR": 4000 + i * 250,
    "Budget Owner": i % 3 === 0 ? "Head of EU Ops" : "Marketplace Lead",
    "Main Pain": "Missing documentation causes launch delays.",
    "Current Workaround": "Manual review through spreadsheets and email.",
    "Next Step": `Run demo checkpoint ${pad(n)}.`,
    "Next Step Due": isoDay(i % 21).slice(0, 10),
    "Risk Level": pick(risks, i),
    "Outcome Score": i % 11
  };
});

const activityRows: RecordFields[] = Array.from({ length: DEMO_ROWS_PER_TABLE }, (_, i) => {
  const n = i + 1;
  return {
    "Activity Name": `Demo Activity ${pad(n)}`,
    Type: pick(activityTypes, i),
    Date: isoDay(i),
    Summary: `Demo activity ${pad(n)} summary for pipeline tracking.`,
    Decision: `Decision note for activity ${pad(n)}.`,
    Owner: i % 2 === 0 ? "sales-1" : "sales-2"
  };
});

const tableConfig = [
  { table: "Accounts", keyField: "Account Name", rows: accountRows },
  { table: "Deals", keyField: "Deal Name", rows: dealRows },
  { table: "Activities", keyField: "Activity Name", rows: activityRows }
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
