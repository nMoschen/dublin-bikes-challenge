import { FilterOperator } from "../types/data.js";
import { FieldType } from "../types/schema.js";

export const dataConstants = {
  comparableFieldTypes: [FieldType.DATE, FieldType.FLOAT, FieldType.INTEGER],
  validRequestKeys: ["where", "page", "size"],
  filters: {
    supportedOperators: Object.values(FilterOperator),
    pagination: {
      defaultPage: 1,
      defaultSize: 25,
      maxSize: 100,
    },
  },
};
