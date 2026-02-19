import { Box } from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { TableFilters, type TableFiltersChangeEvent } from "./TableFilters";
import { memo, useMemo, type FC } from "react";
import { FilterOperator } from "../services/data.service";

export type TableRow = Partial<Record<string, unknown>>;

export type TableColumn<TRow extends TableRow = TableRow> = GridColDef<TRow> & {
  options: string[];
};

export interface TableProps<TRow extends TableRow = TableRow> {
  rows: TRow[];
  columns: TableColumn<TRow>[];
  onChange: (event: TableFiltersChangeEvent) => void;
  isLoading?: boolean;
}

export const Table: FC<TableProps> = memo(function Table<
  TRow extends TableRow = TableRow,
>({ rows, columns, onChange, isLoading }: TableProps<TRow>) {
  const filterFields = useMemo(() => {
    return columns.map(({ field, headerName, type, options }) => ({
      field,
      displayName: headerName!,
      type,
      options,
    }));
  }, [columns]);

  const filterOperators = useMemo(
    () => [
      { operator: FilterOperator.Equal, displayName: "Equal" },
      { operator: FilterOperator.GreaterThan, displayName: "Greater than" },
      { operator: FilterOperator.LowerThan, displayName: "Lower than" },
    ],
    [],
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <TableFilters
        fields={filterFields}
        operators={filterOperators}
        onChange={onChange}
      />
      <DataGrid
        rows={rows}
        columns={columns}
        loading={isLoading}
        disableRowSelectionOnClick
        disableMultipleRowSelection
        disableColumnFilter
      />
    </Box>
  );
});
