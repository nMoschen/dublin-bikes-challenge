import { parseISO } from "date-fns";
import type { TableColumn, TableRow, TableSorting } from "../components/Table";
import { getData, type Filters, type OrderBy } from "./data.service";
import { getSchema, SchemaType, type Schema } from "./schema.service";
import type { TableFilter } from "../components/TableFilters";

export async function getTableColumns(): Promise<TableColumn[]> {
  const schemaResponse = await getSchema();

  if (!schemaResponse.ok) {
    throw new Error(schemaResponse.message);
  }

  return schemaResponse.data.map(generateTableColumn);
}

export async function getTableRows(
  options: GetTableRowsOptions,
): Promise<GetTableRowsResult> {
  const dataResponse = await getData(buildDataQuery(options));

  if (!dataResponse.ok) {
    throw new Error(dataResponse.message);
  }

  const { data, page, size, total } = dataResponse.data;
  return {
    rows: data,
    page: page,
    size: size,
    total: total,
  };
}

export interface GetTableRowsOptions {
  filters?: TableFilter[];
  page: number;
  size: number;
  sorting: TableSorting;
}

export interface GetTableRowsResult {
  rows: TableRow[];
  page: number;
  size: number;
  total: number;
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

function buildDataQuery({
  filters,
  page,
  size,
  sorting,
}: GetTableRowsOptions): Filters {
  const orderBy = buildOrderBy(sorting);

  if (!filters?.length) {
    return { page, size, orderBy };
  }

  const where = filters.reduce((clause, { field, operator, value }) => {
    if (field === "" || operator === "" || value === "") {
      return clause;
    }
    return { ...clause, [field]: { [operator]: value } };
  }, {});

  return { where, page, size, orderBy };
}

function parseDateValue(value: string | null) {
  return value !== null && parseISO(value);
}

function buildOrderBy(sorting: TableSorting): OrderBy | undefined {
  // Backend currently supports sorting by one field, so we only map the first item.
  const [sortItem] = sorting;
  if (
    sortItem === undefined ||
    sortItem.sort === null ||
    sortItem.sort === undefined
  ) {
    return undefined;
  }

  return {
    field: sortItem.field,
    direction: sortItem.sort,
  };
}
