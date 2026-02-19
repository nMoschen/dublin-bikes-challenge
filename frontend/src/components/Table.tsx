import { DataGrid, type GridColDef } from "@mui/x-data-grid";

export type TableRow = Partial<Record<string, unknown>>;

export type TableColumn<TRow extends TableRow = TableRow> = GridColDef<TRow>;

export interface TableProps<TRow extends TableRow = TableRow> {
  rows: TRow[];
  columns: TableColumn<TRow>[];
  isLoading?: boolean;
}

export function Table<TRow extends TableRow = TableRow>({
  rows,
  columns,
  isLoading,
}: TableProps<TRow>) {
  return <DataGrid rows={rows} columns={columns} loading={isLoading} />;
}
