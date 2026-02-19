import { FilterOperator } from "../types/data.js";
import { FieldType } from "../types/schema.js";

export const dataConstants = {
  comparableFieldTypes: [FieldType.DATE, FieldType.FLOAT, FieldType.INTEGER],
  filters: {
    supportedOperators: Object.values(FilterOperator),
    supportedKeys: ["where"],
  },
};
