export type SelectOptions = {
  choices: string[];
};

export type FieldSpec = {
  name: string;
  type:
    | "singleLineText"
    | "multilineText"
    | "singleSelect"
    | "number"
    | "currency"
    | "url"
    | "date"
    | "dateTime";
  options?: SelectOptions;
};

export type TableSpec = {
  name: string;
  description?: string;
  fields: FieldSpec[];
};

export type CrmSchema = {
  baseName: string;
  tables: TableSpec[];
};

export type AirtableField = {
  id: string;
  name: string;
  type: string;
};

export type AirtableTable = {
  id: string;
  name: string;
  fields: AirtableField[];
};

export const mapFieldType = (type: FieldSpec["type"]): string => {
  if (type === "dateTime") return "dateTime";
  if (type === "date") return "date";
  if (type === "multilineText") return "multilineText";
  if (type === "singleLineText") return "singleLineText";
  if (type === "singleSelect") return "singleSelect";
  if (type === "number") return "number";
  if (type === "currency") return "currency";
  if (type === "url") return "url";
  return type;
};

export const loadSchema = async (path: string): Promise<CrmSchema> => {
  const { readFile } = await import("node:fs/promises");
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw) as CrmSchema;
};

export const toChoiceObjects = (options?: SelectOptions): Array<{ name: string }> => {
  if (!options) return [];
  return options.choices.map((name) => ({ name }));
};
