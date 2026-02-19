import { Box } from "@mui/material";
import {
  DataGrid,
  type GridColDef,
  type GridPaginationModel,
  type GridSortModel,
} from "@mui/x-data-grid";
import { TableFilters, type TableFiltersChangeEvent } from "./TableFilters";
import { memo, useMemo, type FC } from "react";
import { FilterOperator } from "../services/data.service";

export type TableRow = Partial<Record<string, unknown>>;

export type TableColumn<TRow extends TableRow = TableRow> = GridColDef<TRow> & {
  options: string[];
};

export type TablePagination = GridPaginationModel;
export type TableSorting = GridSortModel;

export interface TableProps<TRow extends TableRow = TableRow> {
  rows: TRow[];
  columns: TableColumn<TRow>[];
  rowCount: number;
  pagination: TablePagination;
  onPaginationChange: (pagination: TablePagination) => void;
  sorting: TableSorting;
  onSortingChange: (sorting: TableSorting) => void;
  onFiltersChange: (event: TableFiltersChangeEvent) => void;
  isLoading?: boolean;
}

export const Table: FC<TableProps> = memo(function Table<
  TRow extends TableRow = TableRow,
>({
  rows,
  columns,
  rowCount,
  pagination,
  onPaginationChange,
  sorting,
  onSortingChange,
  onFiltersChange,
  isLoading,
}: TableProps<TRow>) {
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
        onChange={onFiltersChange}
      />
      <DataGrid
        rows={rows}
        columns={columns}
        rowCount={rowCount}
        loading={isLoading}
        pagination
        paginationMode="server"
        sortingMode="server"
        paginationModel={pagination}
        onPaginationModelChange={onPaginationChange}
        sortModel={sorting}
        onSortModelChange={onSortingChange}
        pageSizeOptions={[10, 25, 50, 100]}
        disableRowSelectionOnClick
        disableMultipleRowSelection
        disableColumnFilter
      />
    </Box>
  );
});
