export interface Filters {
  page: number;
  size: number;
  where?: FilterWhereClause;
  orderBy?: OrderBy;
}

export type FilterWhereClause = Record<string, FilterField>;

export type FilterField = Partial<Record<FilterOperator, unknown>>;

export enum FilterOperator {
  Equal = "eq",
  GreaterThan = "gt",
  LowerThan = "lt",
}

export enum SortDirection {
  Asc = "asc",
  Desc = "desc",
}

export interface OrderBy {
  field: string;
  direction: SortDirection;
}

export type StandardizedRow = Record<string, StandarizedRowValue>;

export type StandarizedRowValue = boolean | Date | null | number | string;

export interface PaginatedData {
  data: StandardizedRow[];
  page: number;
  size: number;
  total: number;
}

export class DataQueryValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DataQueryValidationError";
  }
}
