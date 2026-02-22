import {
  mapFieldType,
  loadSchema,
  toChoiceObjects,
  type AirtableTable,
  type FieldSpec
} from "./crm-types.mts";

const token = process.env.AIRTABLE_TOKEN;
const baseId = process.env.AIRTABLE_BASE_ID;
const apply = process.argv.includes("--apply");

if (!token || !baseId) {
  console.error("Missing AIRTABLE_TOKEN or AIRTABLE_BASE_ID.");
  process.exit(1);
}

const request = async (
  path: string,
  init: RequestInit = {}
): Promise<{ ok: boolean; status: number; json: () => Promise<unknown>; text: () => Promise<string> }> => {
  return fetch(`https://api.airtable.com/v0/meta/bases/${baseId}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {})
    }
  });
};

const fetchTables = async (): Promise<AirtableTable[]> => {
  const response = await request("/tables");
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch tables: ${response.status} ${text}`);
  }
  const payload = (await response.json()) as { tables?: AirtableTable[] };
  return payload.tables ?? [];
};

const buildFieldPayload = (field: FieldSpec): Record<string, unknown> => {
  if (field.type === "singleSelect") {
    return {
      name: field.name,
      type: "singleSelect",
      options: {
        choices: toChoiceObjects(field.options)
      }
    };
  }

  if (field.type === "currency") {
    return {
      name: field.name,
      type: "currency",
      options: { precision: 2, symbol: "EUR" }
    };
  }

  return {
    name: field.name,
    type: mapFieldType(field.type)
  };
};

const createTable = async (name: string, description: string | undefined, primaryField: FieldSpec): Promise<void> => {
  const payload = {
    name,
    description,
    fields: [buildFieldPayload(primaryField)]
  };

  if (!apply) {
    console.log(`[dry-run] create table ${name}`);
    return;
  }

  const response = await request("/tables", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to create table ${name}: ${response.status} ${text}`);
  }
  console.log(`Created table: ${name}`);
};

const createField = async (tableId: string, tableName: string, field: FieldSpec): Promise<void> => {
  const payload = buildFieldPayload(field);

  if (!apply) {
    console.log(`[dry-run] create field ${tableName}.${field.name}`);
    return;
  }

  const response = await request(`/tables/${tableId}/fields`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to create field ${tableName}.${field.name}: ${response.status} ${text}`);
  }
  console.log(`Created field: ${tableName}.${field.name}`);
};

const main = async (): Promise<void> => {
  const schema = await loadSchema("crm/schema.json");
  let tables = await fetchTables();
  let tableByName = new Map(tables.map((table) => [table.name, table]));

  for (const tableSpec of schema.tables) {
    if (tableSpec.fields.length === 0) {
      throw new Error(`Table ${tableSpec.name} must define at least one field.`);
    }
    if (!tableByName.has(tableSpec.name)) {
      await createTable(tableSpec.name, tableSpec.description, tableSpec.fields[0]);
    }
  }

  if (apply) {
    tables = await fetchTables();
    tableByName = new Map(tables.map((table) => [table.name, table]));
  }

  for (const tableSpec of schema.tables) {
    const existingTable = tableByName.get(tableSpec.name);
    if (!existingTable) {
      throw new Error(`Table ${tableSpec.name} still missing after bootstrap.`);
    }

    const existingFields = new Map(existingTable.fields.map((field) => [field.name, field]));
    for (const fieldSpec of tableSpec.fields) {
      if (!existingFields.has(fieldSpec.name)) {
        await createField(existingTable.id, tableSpec.name, fieldSpec);
      }
    }
  }

  if (!apply) {
    console.log("Dry-run complete. Use --apply to create missing tables/fields.");
  } else {
    console.log("Bootstrap apply complete.");
  }
};

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
