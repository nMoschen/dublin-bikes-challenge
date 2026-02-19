import { FilterOperator, SortDirection } from "../types/data.js";
import { FieldType } from "../types/schema.js";

export const dataConstants = {
  comparableFieldTypes: [FieldType.DATE, FieldType.FLOAT, FieldType.INTEGER],
  validRequestKeys: ["where", "page", "size", "orderBy"],
  filters: {
    supportedOperators: Object.values(FilterOperator),
    supportedSortDirections: Object.values(SortDirection),
    pagination: {
      defaultPage: 1,
      defaultSize: 25,
      maxSize: 100,
    },
  },
};
