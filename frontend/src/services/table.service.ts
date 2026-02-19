import { parseISO } from "date-fns";
import type { TableColumn, TableRow } from "../components/Table";
import { getData, type Filters } from "./data.service";
import { getSchema, SchemaType, type Schema } from "./schema.service";
import type { TableAppliedFilter } from "../components/TableFilters";

export async function getTableColumns(): Promise<TableColumn[]> {
  const schemaResponse = await getSchema();

  if (!schemaResponse.ok) {
    throw new Error(schemaResponse.message);
  }

  return schemaResponse.data.map(generateTableColumn);
}

export async function getTableRows(
  filters?: TableAppliedFilter[],
): Promise<TableRow[]> {
  const dataResponse = await getData(getDataFilters(filters));

  if (!dataResponse.ok) {
    throw new Error(dataResponse.message);
  }

  return dataResponse.data;
}

function generateTableColumn(schema: Schema): TableColumn {
  return {
    field: schema.name,
    headerName: formatHeaderName(schema.display),
    type: getTableColumnType(schema.type),
    headerAlign: "left",
    align: "left",
    valueGetter: generateValueGetter(schema.type),
    options: schema.options,
  };
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
    return parseDateValue;
  }
  return undefined;
}

function getDataFilters(tableFilters?: TableAppliedFilter[]): Filters {
  if (!tableFilters?.length) {
    return {};
  }

  const where = tableFilters.reduce((clause, { field, operator, value }) => {
    if (field === "" || operator === "" || value === "") {
      return clause;
    }
    return { ...clause, [field]: { [operator]: value } };
  }, {});

  return { where };
}

function parseDateValue(value: string | null) {
  return value !== null && parseISO(value);
}
