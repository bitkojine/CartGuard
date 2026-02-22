import { mapFieldType, loadSchema, type AirtableTable } from "./crm-types.mts";

const token = process.env.AIRTABLE_TOKEN;
const baseId = process.env.AIRTABLE_BASE_ID;

if (!token || !baseId) {
  console.error("Missing AIRTABLE_TOKEN or AIRTABLE_BASE_ID.");
  process.exit(1);
}

const fetchTables = async (): Promise<AirtableTable[]> => {
  const response = await fetch(`https://api.airtable.com/v0/meta/bases/${baseId}/tables`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch Airtable tables: ${response.status} ${text}`);
  }

  const data = (await response.json()) as { tables?: AirtableTable[] };
  return data.tables ?? [];
};

const main = async (): Promise<void> => {
  const schema = await loadSchema("crm/schema.json");
  const tables = await fetchTables();
  const tableByName = new Map(tables.map((table) => [table.name, table]));
  const violations: string[] = [];

  for (const tableSpec of schema.tables) {
    const existingTable = tableByName.get(tableSpec.name);
    if (!existingTable) {
      violations.push(`Missing table: ${tableSpec.name}`);
      continue;
    }

    const fieldByName = new Map(existingTable.fields.map((field) => [field.name, field]));
    for (const fieldSpec of tableSpec.fields) {
      const existingField = fieldByName.get(fieldSpec.name);
      if (!existingField) {
        violations.push(`Missing field: ${tableSpec.name}.${fieldSpec.name}`);
        continue;
      }

      const expectedType = mapFieldType(fieldSpec.type);
      if (existingField.type !== expectedType) {
        violations.push(
          `Type mismatch: ${tableSpec.name}.${fieldSpec.name} expected=${expectedType} actual=${existingField.type}`
        );
      }
    }
  }

  if (violations.length > 0) {
    console.error("CRM schema drift detected:");
    for (const violation of violations) {
      console.error(` - ${violation}`);
    }
    process.exit(1);
  }

  console.log("OK: Airtable base matches crm/schema.json");
};

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
