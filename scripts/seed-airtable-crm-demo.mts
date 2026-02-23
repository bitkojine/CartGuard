type RecordFields = Record<string, string | number>;

type AirtableListResponse = {
  records: Array<{ id: string; fields?: RecordFields }>;
  offset?: string;
};

type AccountProfile = {
  accountName: string;
  countryOrigin: "China" | "Hong Kong" | "India" | "Other";
  targetMarket: "Germany" | "France" | "Netherlands" | "Poland" | "Other";
  vertical: "Consumer Electronics" | "Accessories" | "Home Goods" | "Other";
  status: "Target" | "Contacted" | "Qualified" | "Disqualified";
  owner: string;
  website: string;
  note: string;
};

type PilotProfile = {
  pilotId: string;
  stage: "Candidate" | "Qualified" | "Scoped" | "Active" | "Completed Won" | "Completed Lost" | "On Hold";
  exitStatus: "Open" | "Converted" | "Lost" | "Extended";
  feeEur: number;
  startDate: string;
  endDate: string;
  baselineMissingDocRate: number;
  currentMissingDocRate: number;
  nextExecStep: string;
  nextExecDue: string;
};

const token = process.env.AIRTABLE_TOKEN;
const baseId = process.env.AIRTABLE_BASE_ID;

if (!token || !baseId) {
  console.error("Missing AIRTABLE_TOKEN or AIRTABLE_BASE_ID.");
  process.exit(1);
}

const baseUrl = `https://api.airtable.com/v0/${baseId}`;
const DEMO_ROWS_PER_TABLE = 50;

const owners = ["reda", "vytis", "martynas", "danielius", "erikas", "ruta", "milda"];
const brandPrefixes = [
  "Shenzhen",
  "Hangzhou",
  "Guangzhou",
  "Ningbo",
  "Suzhou",
  "Wenzhou",
  "HongKong",
  "Mumbai",
  "Bengaluru",
  "Pune"
];
const brandCores = [
  "Nova",
  "Bright",
  "Pulse",
  "Astra",
  "Orbit",
  "Craft",
  "Edge",
  "Vertex",
  "Nimbus",
  "Atlas"
];
const brandSuffixes = ["Tech", "Retail", "Commerce", "Supply", "Direct", "Global", "Labs", "Works"];
const tlds = ["cn", "hk", "in", "com"];

const statusByBucket: Array<AccountProfile["status"]> = [
  "Target",
  "Contacted",
  "Qualified",
  "Qualified",
  "Contacted",
  "Qualified",
  "Disqualified"
];

const stageByBucket: Array<PilotProfile["stage"]> = [
  "Candidate",
  "Qualified",
  "Scoped",
  "Active",
  "Active",
  "Completed Won",
  "Completed Lost",
  "On Hold",
  "Qualified",
  "Scoped"
];

const targetByCountry: Record<AccountProfile["countryOrigin"], AccountProfile["targetMarket"]> = {
  China: "Germany",
  "Hong Kong": "Germany",
  India: "France",
  Other: "Netherlands"
};

const verticalByCountry: Record<AccountProfile["countryOrigin"], AccountProfile["vertical"]> = {
  China: "Consumer Electronics",
  "Hong Kong": "Accessories",
  India: "Home Goods",
  Other: "Other"
};

const pad = (value: number): string => String(value).padStart(3, "0");

const isoDate = (dayOffset: number): string => {
  const date = new Date(Date.UTC(2026, 0, 8 + dayOffset, 10, 0, 0));
  return date.toISOString().slice(0, 10);
};

const isoDateTime = (dayOffset: number): string => {
  const date = new Date(Date.UTC(2026, 0, 8 + dayOffset, 10, 0, 0));
  return date.toISOString();
};

const toSlug = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const accountProfileFor = (index: number): AccountProfile => {
  const countryCycle: AccountProfile["countryOrigin"][] = ["China", "China", "China", "Hong Kong", "India", "Other"];
  const countryOrigin = countryCycle[index % countryCycle.length]!;
  const vertical = verticalByCountry[countryOrigin];
  const targetMarket = targetByCountry[countryOrigin];
  const status = statusByBucket[index % statusByBucket.length]!;

  const prefix = brandPrefixes[index % brandPrefixes.length]!;
  const core = brandCores[(index * 3) % brandCores.length]!;
  const suffix = brandSuffixes[(index * 5) % brandSuffixes.length]!;
  const legalName = `${prefix} ${core} ${suffix}`;
  const accountName = `${legalName} ${pad(index + 1)}`;

  const tld = tlds[index % tlds.length]!;
  const website = `https://${toSlug(`${prefix}-${core}-${suffix}`)}.${tld}`;

  const owner = owners[index % owners.length]!;

  const note =
    vertical === "Consumer Electronics"
      ? "Needs CE and importer evidence package before Germany launch."
      : vertical === "Accessories"
        ? "Needs packaging registration evidence before listing push."
        : vertical === "Home Goods"
          ? "Needs multilingual labeling evidence and product sheet alignment."
          : "Needs category rule mapping before qualification.";

  return {
    accountName,
    countryOrigin,
    targetMarket,
    vertical,
    status,
    owner,
    website,
    note
  };
};

const pilotProfileFor = (index: number, account: AccountProfile): PilotProfile => {
  const stage = stageByBucket[index % stageByBucket.length]!;
  const pilotId = `PILOT-${pad(index + 1)}`;

  const startOffset = index % 45;
  const startDate = isoDate(startOffset);
  const endDate = isoDate(startOffset + 21);

  const baselineMissingDocRate = account.vertical === "Consumer Electronics" ? 28 - (index % 5) : 22 - (index % 6);
  const improvementBase = stage === "Completed Won" ? 10 : stage === "Active" ? 7 : stage === "Scoped" ? 4 : 2;
  const currentMissingDocRate = Math.max(3, baselineMissingDocRate - improvementBase);

  const feeBase = account.vertical === "Consumer Electronics" ? 7200 : account.vertical === "Accessories" ? 5600 : 4800;
  const feeStageBoost = stage === "Active" || stage === "Completed Won" ? 2200 : stage === "Scoped" ? 1100 : 0;
  const feeEur = feeBase + feeStageBoost + (index % 4) * 350;

  const exitStatus: PilotProfile["exitStatus"] =
    stage === "Completed Won" ? "Converted" : stage === "Completed Lost" ? "Lost" : stage === "On Hold" ? "Extended" : "Open";

  const nextExecStep =
    stage === "Candidate"
      ? "Confirm pilot owner and shortlist first 100 SKUs for document scan."
      : stage === "Qualified"
        ? "Collect baseline missing-document rate from latest listing batch."
        : stage === "Scoped"
          ? "Approve pilot scope and sign paid pilot order."
          : stage === "Active"
            ? "Run weekly review and close top missing-document blockers."
            : stage === "Completed Won"
              ? "Prepare annual contract handoff with KPI summary."
              : stage === "Completed Lost"
                ? "Document loss reason and archive pilot notes."
                : "Unblock customer response and reset weekly cadence.";

  const nextExecDue = isoDate(startOffset + 3 + (index % 5));

  return {
    pilotId,
    stage,
    exitStatus,
    feeEur,
    startDate,
    endDate,
    baselineMissingDocRate,
    currentMissingDocRate,
    nextExecStep,
    nextExecDue
  };
};

const accountRows: RecordFields[] = Array.from({ length: DEMO_ROWS_PER_TABLE }, (_, i) => {
  const profile = accountProfileFor(i);
  return {
    "Account Name": profile.accountName,
    "Country Origin": profile.countryOrigin,
    "Target EU Market": profile.targetMarket,
    Vertical: profile.vertical,
    Website: profile.website,
    Status: profile.status,
    Owner: profile.owner,
    Notes: profile.note
  };
});

const pilotRows: RecordFields[] = Array.from({ length: DEMO_ROWS_PER_TABLE }, (_, i) => {
  const account = accountProfileFor(i);
  const pilot = pilotProfileFor(i, account);

  return {
    "Pilot ID": pilot.pilotId,
    "Account Name": account.accountName,
    Stage: pilot.stage,
    "Pilot Fee EUR": pilot.feeEur,
    "Pilot Start Date": pilot.startDate,
    "Pilot Target End Date": pilot.endDate,
    "Baseline Missing Doc Rate": pilot.baselineMissingDocRate,
    "Current Missing Doc Rate": pilot.currentMissingDocRate,
    "Next Exec Step": pilot.nextExecStep,
    "Next Exec Due": pilot.nextExecDue,
    "Pilot Exit Status": pilot.exitStatus
  };
});

const noteRows: RecordFields[] = Array.from({ length: DEMO_ROWS_PER_TABLE }, (_, i) => {
  const pilot = pilotProfileFor(i, accountProfileFor(i));
  const noteType = (["Review", "Risk", "Evidence", "Decision"] as const)[i % 4]!;
  const priority = (["High", "Medium", "Low"] as const)[i % 3]!;

  const summary =
    noteType === "Review"
      ? `Weekly review completed for ${pilot.pilotId}; missing-document rate now ${pilot.currentMissingDocRate}%.`
      : noteType === "Risk"
        ? `Risk logged for ${pilot.pilotId}: supplier certificate package missing for top-selling SKU group.`
        : noteType === "Evidence"
          ? `Evidence uploaded for ${pilot.pilotId}: importer declaration and labeling files attached.`
          : `Decision recorded for ${pilot.pilotId}: proceed with Germany rollout after next verification batch.`;

  const owner = owners[(i + 2) % owners.length]!;
  const link = `https://crm-demo.cartguard.dev/pilots/${toSlug(pilot.pilotId)}/notes/${pad(i + 1)}`;

  return {
    "Note ID": `NOTE-${pad(i + 1)}`,
    "Pilot ID": pilot.pilotId,
    "Note Type": noteType,
    "Note Date": isoDateTime((i % 35) + 1),
    Owner: owner,
    Summary: summary,
    Link: link,
    Priority: priority
  };
});

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
