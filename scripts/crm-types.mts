import { z } from "zod";

export const SelectOptionsSchema = z.object({
  choices: z.array(z.string())
});

export type SelectOptions = z.infer<typeof SelectOptionsSchema>;

export const FieldTypeSchema = z.enum([
  "singleLineText",
  "multilineText",
  "singleSelect",
  "number",
  "currency",
  "url",
  "date",
  "dateTime"
]);

export type FieldType = z.infer<typeof FieldTypeSchema>;

export const FieldSpecSchema = z.object({
  name: z.string().min(1),
  type: FieldTypeSchema,
  options: SelectOptionsSchema.optional()
});

export type FieldSpec = z.infer<typeof FieldSpecSchema>;

export const TableSpecSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  fields: z.array(FieldSpecSchema)
});

export type TableSpec = z.infer<typeof TableSpecSchema>;

export const CrmSchemaSchema = z.object({
  baseName: z.string().min(1),
  tables: z.array(TableSpecSchema)
});

export type CrmSchema = z.infer<typeof CrmSchemaSchema>;

export const AirtableFieldSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string()
});

export type AirtableField = z.infer<typeof AirtableFieldSchema>;

export const AirtableTableSchema = z.object({
  id: z.string(),
  name: z.string(),
  fields: z.array(AirtableFieldSchema)
});

export type AirtableTable = z.infer<typeof AirtableTableSchema>;

export const mapFieldType = (type: FieldType): string => {
  return type;
};

export const loadSchema = async (path: string): Promise<CrmSchema> => {
  const { readFile } = await import("node:fs/promises");
  const raw = await readFile(path, "utf8");
  const data = JSON.parse(raw) as unknown;
  return CrmSchemaSchema.parse(data);
};

export const toChoiceObjects = (options?: SelectOptions): Array<{ name: string }> => {
  if (!options) return [];
  return options.choices.map((name: string) => ({ name }));
};
