import { parseISO } from "date-fns";
import type { TableColumn, TableRow } from "../components/Table";
import { getData } from "./data.service";
import { getSchema, SchemaType } from "./schema.service";

export interface TableData {
  rows: TableRow[];
  columns: TableColumn[];
}

export async function getTableData(): Promise<TableData> {
  const [dataResponse, schemaResponse] = await Promise.all([
    getData(),
    getSchema(),
  ]);

  if (!dataResponse.ok) {
    throw new Error(dataResponse.message);
  }

  if (!schemaResponse.ok) {
    throw new Error(schemaResponse.message);
  }

  const columns: TableColumn[] = schemaResponse.data.map((schema) => ({
    field: schema.name,
    headerName: formatHeaderName(schema.display),
    type: getTableColumnType(schema.type),
    headerAlign: "left",
    align: "left",
    valueGetter: generateValueGetter(schema.type),
    valueOptions: schema.options,
  }));

  return { columns, rows: dataResponse.data };
}

function formatHeaderName(headerName: string): string {
  return headerName.charAt(0).toUpperCase() + headerName.slice(1);
}

function getTableColumnType(schemaType: SchemaType): TableColumn["type"] {
  switch (schemaType) {
    case SchemaType.Boolean:
      return "boolean";
    case SchemaType.Integer:
    case SchemaType.Float:
      return "number";
    case SchemaType.Date:
      return "dateTime";
    case SchemaType.Text:
      return "string";
    case SchemaType.Option:
      return "singleSelect";
  }
}

function generateValueGetter(schemaType: SchemaType) {
  if (schemaType === SchemaType.Date) {
    return (value: string | null) => value !== null && parseISO(value);
  }
  return undefined;
}
