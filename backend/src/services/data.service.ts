import { dataConstants } from "../constants/data.constants.js";
import {
  Filters,
  DataQueryValidationError,
  FilterWhereClause,
  FilterField,
  StandardizedRow,
  StandarizedRowValue,
  FilterOperator,
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

export async function getData(payload: unknown): Promise<StandardizedRow[]> {
  const [rows, schema] = await Promise.all([getDatasetRows(), getSchema()]);
  const standardizedRows = rows.map((row) => buildStandarizedRow(row, schema));

  const filters = parsePayload(payload);
  if (filters.where === undefined || isEmptyRecord(filters.where)) {
    return standardizedRows;
  }

  const filter = parseFilter(filters.where, schema);

  return standardizedRows.filter((row) => {
    const rowValue = row[filter.field.name];
    return doesValueMatchFilter(
      rowValue,
      filter.field.type,
      filter.operator,
      filter.value,
    );
  });
}

function parsePayload(payload: unknown): Filters {
  if (payload === undefined) {
    return {};
  }

  if (!isRecord(payload)) {
    throw new DataQueryValidationError("Request body must be a JSON object");
  }

  const invalidKeys = getInvalidFilterKeys(payload);
  if (invalidKeys.length > 0) {
    throw new DataQueryValidationError(
      `Unsupported request key(s): ${invalidKeys.join(", ")}. Supported key(s): ${dataConstants.filters.supportedKeys.join(", ")}.`,
    );
  }

  const whereClause = payload.where;
  if (whereClause === undefined) {
    return {};
  }

  if (!isRecord(whereClause)) {
    throw new DataQueryValidationError(`'where' must be an object`);
  }

  return {
    where: parseWhereClause(whereClause),
  };
}

function getInvalidFilterKeys(payload: Record<string, unknown>): string[] {
  const supportedKeys = new Set<string>(dataConstants.filters.supportedKeys);
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

function buildStandarizedRow(row: RawRow, schema: Field[]): StandardizedRow {
  const standardizedRow: StandardizedRow = {};
  for (const field of schema) {
    standardizedRow[field.name] = parseValue(row[field.display], field.type);
  }
  return standardizedRow;
}

function parseValue(value: unknown, fieldType: FieldType): StandarizedRowValue {
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
  value: StandarizedRowValue;
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
  rowValue: StandarizedRowValue,
  fieldType: FieldType,
  operator: FilterOperator,
  filterValue: StandarizedRowValue,
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
  left: StandarizedRowValue,
  right: StandarizedRowValue,
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
