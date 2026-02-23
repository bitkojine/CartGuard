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

const tableConfig = [
  {
    table: "Accounts",
    keyField: "Account Name",
    rows: [
      {
        "Account Name": "Shenzhen NovaTech",
        "Country Origin": "China",
        "Target EU Market": "Germany",
        Vertical: "Consumer Electronics",
        "ICP Fit": 5,
        Website: "https://example.com/novatech",
        Status: "Target",
        Owner: "sales-1",
        Notes: "High SKU count, Amazon.de first."
      },
      {
        "Account Name": "HK Bright Devices",
        "Country Origin": "Hong Kong",
        "Target EU Market": "Germany",
        Vertical: "Accessories",
        "ICP Fit": 4,
        Website: "https://example.com/bright-devices",
        Status: "Contacted",
        Owner: "sales-2",
        Notes: "Fast-moving accessories catalog."
      },
      {
        "Account Name": "IndiVolt Home",
        "Country Origin": "India",
        "Target EU Market": "Netherlands",
        Vertical: "Home Goods",
        "ICP Fit": 3,
        Website: "https://example.com/indivolt",
        Status: "Qualified",
        Owner: "sales-1",
        Notes: "Potential second-wave expansion account."
      }
    ] as RecordFields[]
  },
  {
    table: "Deals",
    keyField: "Deal Name",
    rows: [
      {
        "Deal Name": "NovaTech DE Pilot Q1",
        Stage: "Pilot Proposed",
        "Value EUR": 12000,
        "Budget Owner": "Head of EU Ops",
        "Main Pain": "Missing documentation slows listing approvals.",
        "Current Workaround": "Manual spreadsheet + agency review.",
        "Next Step": "Pilot scope review call.",
        "Next Step Due": "2026-03-03",
        "Risk Level": "Medium",
        "Outcome Score": 0
      },
      {
        "Deal Name": "Bright Devices Fast-Track",
        Stage: "Discovery Done",
        "Value EUR": 8000,
        "Budget Owner": "Marketplace Lead",
        "Main Pain": "Frequent rework loops for product launch docs.",
        "Current Workaround": "Ad-hoc checks by account manager.",
        "Next Step": "Send paid pilot offer.",
        "Next Step Due": "2026-03-01",
        "Risk Level": "Medium",
        "Outcome Score": 0
      },
      {
        "Deal Name": "IndiVolt EU Readiness",
        Stage: "Qualified",
        "Value EUR": 6000,
        "Budget Owner": "Founder",
        "Main Pain": "No repeatable process for EU listing requirements.",
        "Current Workaround": "External consultant + email approvals.",
        "Next Step": "Book technical workflow mapping call.",
        "Next Step Due": "2026-03-05",
        "Risk Level": "High",
        "Outcome Score": 0
      }
    ] as RecordFields[]
  },
  {
    table: "Activities",
    keyField: "Activity Name",
    rows: [
      {
        "Activity Name": "NovaTech Discovery Call",
        Type: "Call",
        Date: "2026-02-23T10:30:00.000Z",
        Summary: "Confirmed Germany-first launch and high document review load.",
        Decision: "Proceed to pilot scope draft.",
        Owner: "sales-1"
      },
      {
        "Activity Name": "Bright Follow-up Email",
        Type: "Follow-up",
        Date: "2026-02-23T12:15:00.000Z",
        Summary: "Shared paid pilot outline and expected metrics.",
        Decision: "Waiting for budget owner confirmation.",
        Owner: "sales-2"
      },
      {
        "Activity Name": "IndiVolt Outreach",
        Type: "Outreach",
        Date: "2026-02-23T14:00:00.000Z",
        Summary: "Initial outreach sent via warm intro channel.",
        Decision: "Pending reply.",
        Owner: "sales-1"
      }
    ] as RecordFields[]
  }
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
