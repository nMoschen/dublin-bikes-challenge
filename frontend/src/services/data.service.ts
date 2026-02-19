import { fetchApi } from "./api.service";

export type Item = Record<string, ItemValue>;
export type ItemValue = boolean | Date | null | number | string;

export interface Filters {
  where?: FilterWhereClause;
}
export type FilterWhereClause = Record<string, FilterField>;
export type FilterField = Partial<Record<FilterOperator, unknown>>;
export enum FilterOperator {
  Equal = "eq",
  GreaterThan = "gt",
  LowerThan = "lt",
}

export async function getData(filters?: Filters) {
  return fetchApi<Item[]>({
    endpoint: "data",
    options: {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(filters),
    },
  });
}
