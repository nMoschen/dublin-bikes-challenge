import { Box, MenuItem, TextField } from "@mui/material";

import { memo, useState, type ChangeEvent, type FC } from "react";
import type { FilterOperator } from "../services/data.service";
import type { TableColumn } from "./Table";

export interface TableFilter {
  field: string;
  operator: FilterOperator | "";
  value: string | number;
}

export interface TableFiltersChangeEvent {
  filters: TableFilter[];
}

export interface TableFiltersField {
  field: string;
  displayName: string;
  type: TableColumn["type"];
  options: string[];
}

export interface TableFiltersOperator {
  operator: FilterOperator;
  displayName: string;
}

export interface TableFiltersProps {
  fields: TableFiltersField[];
  operators: TableFiltersOperator[];
  onChange: (event: TableFiltersChangeEvent) => void;
}

export const TableFilters: FC<TableFiltersProps> = memo(function TableFilters({
  fields,
  operators,
  onChange,
}: TableFiltersProps) {
  const [currentField, setCurrentField] = useState<string | "">("");
  const [currentOperator, setCurrentOperator] = useState<FilterOperator | "">(
    "",
  );
  const [currentType, setCurrentType] = useState<TableColumn["type"] | "">("");
  const [currentValueOptions, setCurrentValueOptions] = useState<string[]>([]);
  const [currentValue, setCurrentValue] = useState<string | number>("");

  const handleFieldChange = (event: ChangeEvent<HTMLInputElement>) => {
    const updatedField = event.target.value;
    setCurrentField(updatedField);

    if (!updatedField) {
      setCurrentType("");
      setCurrentValue("");
      setCurrentValueOptions([]);

      onChange({
        filters: [{ field: updatedField, operator: "", value: "" }],
      });
      return;
    }

    const { type, options } = fields.find(
      ({ field }) => field === updatedField,
    )!;
    if (currentType !== type) {
      setCurrentType(type);
      setCurrentValue("");
      setCurrentValueOptions(options);

      onChange({
        filters: [
          { field: updatedField, operator: currentOperator, value: "" },
        ],
      });
      return;
    }

    setCurrentValueOptions(options);

    onChange({
      filters: [
        {
          field: updatedField,
          operator: currentOperator,
          value: currentValue,
        },
      ],
    });
  };

  const handleOperatorChange = (event: ChangeEvent<HTMLInputElement>) => {
    const operator = event.target.value as FilterOperator;
    setCurrentOperator(operator);
    onChange({
      filters: [{ field: currentField, operator, value: currentValue }],
    });
  };

  const handleValueChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setCurrentValue(value);
    onChange({
      filters: [{ field: currentField, operator: currentOperator, value }],
    });
  };

  return (
    <Box sx={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
      <TextField
        sx={{ minWidth: 200 }}
        select
        value={currentField}
        label="Field"
        onChange={handleFieldChange}
      >
        <MenuItem value="">
          <em>None</em>
        </MenuItem>
        {fields.map(({ field, displayName }) => (
          <MenuItem key={field} value={field}>
            {displayName}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        sx={{ minWidth: 200 }}
        select
        value={currentOperator}
        label="Operator"
        onChange={handleOperatorChange}
      >
        <MenuItem value="">
          <em>None</em>
        </MenuItem>
        {operators.map(({ operator, displayName }) => (
          <MenuItem key={operator} value={operator}>
            {displayName}
          </MenuItem>
        ))}
      </TextField>

      {(currentType === "number" || currentType === "string") && (
        <TextField
          sx={{ minWidth: 200 }}
          value={currentValue}
          label="Value"
          onChange={handleValueChange}
        />
      )}

      {currentType === "dateTime" && (
        <TextField
          sx={{ minWidth: 200 }}
          type="date"
          value={currentValue}
          label="Date"
          onChange={handleValueChange}
        />
      )}

      {currentType === "boolean" && (
        <TextField
          sx={{ minWidth: 200 }}
          select
          value={currentValue}
          label="Option"
          onChange={handleValueChange}
        >
          <MenuItem value="">
            <em>None</em>
          </MenuItem>
          <MenuItem key="true" value="true">
            True
          </MenuItem>
          <MenuItem key="false" value="false">
            False
          </MenuItem>
        </TextField>
      )}

      {currentType === "singleSelect" && (
        <TextField
          sx={{ minWidth: 200 }}
          select
          value={currentValue}
          label="Option"
          onChange={handleValueChange}
        >
          <MenuItem value="">
            <em>None</em>
          </MenuItem>
          {currentValueOptions.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </TextField>
      )}
    </Box>
  );
});
