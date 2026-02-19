import { dataConstants } from "../constants/data.constants.js";
import {
  DataQueryValidationError,
  FilterWhereClause,
  FilterField,
  Filters,
  OrderBy,
  PaginatedData,
  StandardizedRow,
  StandardizedRowValue,
  FilterOperator,
  SortDirection,
} from "../types/data.js";
import { Field, FieldType, RawRow } from "../types/schema.js";
import {
  normalizeNullable,
  normalizeText,
  parseBooleanLike,
  parseDateLike,
  parseNumberLike,
} from "../utils/normalize.js";
import { getDatasetRows } from "./dataset.service.js";
import { getSchema } from "./schema.service.js";

export async function getData(payload: unknown): Promise<PaginatedData> {
  const [rows, schema] = await Promise.all([getDatasetRows(), getSchema()]);
  const standardizedRows = rows.map((row) => buildStandardizedRow(row, schema));
  const parsedFilters = parseDataQuery(payload, schema);

  // Query pipeline order matters: filter first, then sort the filtered set, then paginate.
  const filteredRows = applyWhereFilter(
    standardizedRows,
    schema,
    parsedFilters.where,
  );
  const sortedRows = applyOrderBy(filteredRows, parsedFilters.orderBy);

  return buildPaginatedData(sortedRows, parsedFilters.page, parsedFilters.size);
}

function applyWhereFilter(
  rows: StandardizedRow[],
  schema: Field[],
  whereClause?: FilterWhereClause,
): StandardizedRow[] {
  if (whereClause === undefined || isEmptyRecord(whereClause)) {
    return rows;
  }

  const filter = parseFilter(whereClause, schema);

  return rows.filter((row) => {
    const rowValue = row[filter.field.name];
    return doesValueMatchFilter(
      rowValue,
      filter.field.type,
      filter.operator,
      filter.value,
    );
  });
}

function parseDataQuery(payload: unknown, schema: Field[]): Filters {
  if (payload === undefined) {
    return getDefaultFilters();
  }

  if (!isRecord(payload)) {
    throw new DataQueryValidationError("Request body must be a JSON object");
  }

  const invalidKeys = getInvalidRequestKeys(payload);
  if (invalidKeys.length > 0) {
    throw new DataQueryValidationError(
      `Unsupported request key(s): ${invalidKeys.join(", ")}. Supported key(s): ${dataConstants.validRequestKeys.join(", ")}.`,
    );
  }

  const page = parsePaginationValue({
    value: payload.page,
    key: "page",
    defaultValue: dataConstants.filters.pagination.defaultPage,
  });
  const size = parsePaginationValue({
    value: payload.size,
    key: "size",
    defaultValue: dataConstants.filters.pagination.defaultSize,
    maxValue: dataConstants.filters.pagination.maxSize,
  });
  const orderBy = parseOrderBy(payload.orderBy, schema);

  const whereClause = payload.where;
  if (whereClause === undefined) {
    return { page, size, orderBy };
  }

  if (!isRecord(whereClause)) {
    throw new DataQueryValidationError(`'where' must be an object`);
  }

  return {
    page,
    size,
    orderBy,
    where: parseWhereClause(whereClause),
  };
}

function getDefaultFilters(): Filters {
  return {
    page: dataConstants.filters.pagination.defaultPage,
    size: dataConstants.filters.pagination.defaultSize,
  };
}

function getInvalidRequestKeys(payload: Record<string, unknown>): string[] {
  const supportedKeys = new Set<string>(dataConstants.validRequestKeys);
  return Object.keys(payload).filter((key) => !supportedKeys.has(key));
}

function parseWhereClause(
  whereClause: Record<string, unknown>,
): FilterWhereClause {
  const entries = Object.entries(whereClause);

  if (entries.length > 1) {
    throw new DataQueryValidationError(
      "Filtering by multiple fields is out of scope for now",
    );
  }

  if (entries.length === 0) {
    return {};
  }

  const [fieldName, conditionValue] = entries[0];

  if (!isRecord(conditionValue)) {
    throw new DataQueryValidationError(
      `Condition for field '${fieldName}' must be an object`,
    );
  }

  const operatorEntries = Object.entries(conditionValue).filter(([key]) =>
    isFilterOperator(key),
  );
  if (
    operatorEntries.length !== 1 ||
    operatorEntries.length !== Object.keys(conditionValue).length
  ) {
    throw new DataQueryValidationError(
      `Field '${fieldName}' must have exactly one operator: ${dataConstants.filters.supportedOperators.join(", ")}`,
    );
  }

  const [operator, value] = operatorEntries[0];
  if (value === undefined) {
    throw new DataQueryValidationError(
      `Operator '${operator}' for field '${fieldName}' requires a value`,
    );
  }

  return {
    [fieldName]: {
      [operator]: value,
    },
  };
}

function parseOrderBy(value: unknown, schema: Field[]): OrderBy | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!isRecord(value)) {
    throw new DataQueryValidationError(`'orderBy' must be an object`);
  }

  const field = value.field;
  if (typeof field !== "string" || field.trim() === "") {
    throw new DataQueryValidationError(`'orderBy.field' must be a field name`);
  }

  const schemaField = schema.find(({ name }) => name === field);
  if (schemaField === undefined) {
    throw new DataQueryValidationError(
      `Unknown orderBy field '${field}'. Use names from /schema response`,
    );
  }

  const direction = value.direction;
  if (!isSortDirection(direction)) {
    throw new DataQueryValidationError(
      `'orderBy.direction' must be one of: ${dataConstants.filters.supportedSortDirections.join(", ")}`,
    );
  }

  return {
    field,
    direction,
  };
}

function parsePaginationValue({
  value,
  key,
  defaultValue,
  maxValue,
}: {
  value: unknown;
  key: "page" | "size";
  defaultValue: number;
  maxValue?: number;
}): number {
  if (value === undefined) {
    return defaultValue;
  }

  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new DataQueryValidationError(`'${key}' must be an integer`);
  }

  if (value < 1) {
    throw new DataQueryValidationError(`'${key}' must be greater than 0`);
  }

  if (maxValue !== undefined && value > maxValue) {
    throw new DataQueryValidationError(
      `'${key}' must be lower than or equal to ${String(maxValue)}`,
    );
  }

  return value;
}

function applyOrderBy(
  rows: StandardizedRow[],
  orderBy?: OrderBy,
): StandardizedRow[] {
  if (orderBy === undefined) {
    return rows;
  }

  return rows.toSorted((leftRow, rightRow) => {
    const leftValue = leftRow[orderBy.field];
    const rightValue = rightRow[orderBy.field];

    // Keep nulls last regardless of direction to avoid sparse values taking over first pages.
    if (leftValue === null) {
      return rightValue === null ? 0 : 1;
    }

    if (rightValue === null) {
      return -1;
    }

    const comparison = compareSortValues(leftValue, rightValue);
    if (orderBy.direction === SortDirection.Desc) {
      return comparison * -1;
    }
    return comparison;
  });
}

function compareSortValues(
  left: Exclude<StandardizedRowValue, null>,
  right: Exclude<StandardizedRowValue, null>,
): number {
  if (left instanceof Date && right instanceof Date) {
    return comparePrimitiveValues(left.getTime(), right.getTime());
  }

  if (typeof left === "string" && typeof right === "string") {
    // Using sensitivity here as it's case/accent insensitive ("OPEN" and "open" compare as equal)
    return left.localeCompare(right, undefined, { sensitivity: "base" });
  }

  if (typeof left === "boolean" && typeof right === "boolean") {
    return comparePrimitiveValues(Number(left), Number(right));
  }

  if (typeof left === "number" && typeof right === "number") {
    return comparePrimitiveValues(left, right);
  }

  return comparePrimitiveValues(String(left), String(right));
}

function comparePrimitiveValues(
  left: number | string,
  right: number | string,
): number {
  if (left === right) {
    return 0;
  }
  return left > right ? 1 : -1;
}

function buildPaginatedData(
  rows: StandardizedRow[],
  page: number,
  size: number,
): PaginatedData {
  const total = rows.length;

  const startIndex = (page - 1) * size;
  const endIndex = startIndex + size;
  const data = rows.slice(startIndex, endIndex);

  return {
    data,
    page,
    size,
    total,
  };
}

function buildStandardizedRow(row: RawRow, schema: Field[]): StandardizedRow {
  const standardizedRow: StandardizedRow = {};
  for (const field of schema) {
    standardizedRow[field.name] = parseValue(row[field.display], field.type);
  }
  return standardizedRow;
}

function parseValue(
  value: unknown,
  fieldType: FieldType,
): StandardizedRowValue {
  const normalizedValue = normalizeNullable(value);

  if (normalizedValue === null) {
    return null;
  }

  if (fieldType === FieldType.BOOLEAN) {
    return parseBooleanLike(normalizedValue);
  }

  if (fieldType === FieldType.DATE) {
    return parseDateLike(normalizedValue);
  }

  if (fieldType === FieldType.FLOAT || fieldType === FieldType.INTEGER) {
    const parsedNumber = parseNumberLike(normalizedValue);
    return parsedNumber === null ? null : parsedNumber.value;
  }

  return normalizeText(normalizedValue);
}

function parseFilter(
  whereClause: FilterWhereClause,
  schema: Field[],
): {
  field: Field;
  operator: FilterOperator;
  value: StandardizedRowValue;
} {
  const [fieldName, condition] = getSingleFilterEntry(whereClause);

  const field = schema.find(({ name }) => name === fieldName);
  if (field === undefined) {
    throw new DataQueryValidationError(
      `Unknown field '${fieldName}'. Use names from /schema response`,
    );
  }

  const { operator, value } = getFilterOperation(condition);
  if (!isOperatorCompatible(field.type, operator)) {
    throw new DataQueryValidationError(
      `Operator '${operator}' is only supported for ${dataConstants.comparableFieldTypes.join(", ")} fields`,
    );
  }

  const normalizedValue = normalizeNullable(value);
  if (normalizedValue === null) {
    return {
      field,
      operator,
      value: null,
    };
  }

  const parsedValue = parseValue(normalizedValue, field.type);
  if (parsedValue === null) {
    throw new DataQueryValidationError(
      `Invalid value for field '${field.name}' of type '${field.type}'`,
    );
  }
  return {
    field,
    operator,
    value: parsedValue,
  };
}

function getSingleFilterEntry(
  whereClause: FilterWhereClause,
): [string, FilterField] {
  const entries = Object.entries(whereClause);
  if (entries.length === 0) {
    throw new DataQueryValidationError("Empty 'where' clause is not supported");
  }
  if (entries.length > 1) {
    throw new DataQueryValidationError(
      "Filtering by multiple fields is out of scope for now",
    );
  }
  return entries[0];
}

function getFilterOperation(condition: FilterField): {
  operator: FilterOperator;
  value: unknown;
} {
  if (condition.eq !== undefined) {
    return { operator: FilterOperator.Equal, value: condition.eq };
  }
  if (condition.gt !== undefined) {
    return { operator: FilterOperator.GreaterThan, value: condition.gt };
  }
  return { operator: FilterOperator.LowerThan, value: condition.lt };
}

function doesValueMatchFilter(
  rowValue: StandardizedRowValue,
  fieldType: FieldType,
  operator: FilterOperator,
  filterValue: StandardizedRowValue,
): boolean {
  if (operator === FilterOperator.Equal) {
    return areValuesEqual(rowValue, filterValue);
  }

  if (rowValue === null || filterValue === null) {
    return false;
  }

  if (typeof rowValue === "number" && typeof filterValue === "number") {
    return compareNumbers(rowValue, filterValue, operator);
  }

  if (fieldType === FieldType.DATE) {
    if (!(rowValue instanceof Date) || !(filterValue instanceof Date)) {
      return false;
    }
    return compareNumbers(rowValue.getTime(), filterValue.getTime(), operator);
  }

  return false;
}

function areValuesEqual(
  left: StandardizedRowValue,
  right: StandardizedRowValue,
): boolean {
  if (left instanceof Date && right instanceof Date) {
    return left.getTime() === right.getTime();
  }
  if (typeof left === "string" && typeof right === "string") {
    return left.toLowerCase() === right.toLowerCase();
  }
  return left === right;
}

function compareNumbers(
  left: number,
  right: number,
  operator: Exclude<FilterOperator, FilterOperator.Equal>,
): boolean {
  return operator === FilterOperator.GreaterThan ? left > right : left < right;
}

function isEmptyRecord(value: Record<string, unknown>): boolean {
  return Object.keys(value).length === 0;
}

function isFilterOperator(value: unknown): value is FilterOperator {
  return Object.values(FilterOperator).some((operator) => operator === value);
}

function isSortDirection(value: unknown): value is SortDirection {
  return dataConstants.filters.supportedSortDirections.some(
    (direction) => direction === value,
  );
}

function isOperatorCompatible(
  fieldType: FieldType,
  operator: FilterOperator,
): boolean {
  if (operator === FilterOperator.Equal) {
    return true;
  }
  return dataConstants.comparableFieldTypes.includes(fieldType);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
