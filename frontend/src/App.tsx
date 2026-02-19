import { Box, Typography } from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { Table, type TableColumn, type TableRow } from "./components/Table";
import { getTableColumns, getTableRows } from "./services/table.service";
import type {
  TableAppliedFilter,
  TableFiltersChangeEvent,
} from "./components/TableFilters";

function App() {
  const [tableColumns, setTableColumns] = useState<TableColumn[]>([]);
  const [tableRows, setTableRows] = useState<TableRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingFilters, setPendingFilters] = useState<
    TableAppliedFilter[] | null
  >(null);

  const fetchRows = useCallback((filters: TableAppliedFilter[]) => {
    getTableRows(filters)
      .then((rows) => {
        setErrorMessage(null);
        setTableRows(rows);
      })
      .catch((error: Error) => {
        setErrorMessage(error.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    Promise.all([getTableColumns(), getTableRows([])])
      .then(([columns, rows]) => {
        setErrorMessage(null);
        setTableColumns(columns);
        setTableRows(rows);
      })
      .catch((error: Error) => {
        setErrorMessage(error.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    if (pendingFilters === null) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      fetchRows(pendingFilters);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [fetchRows, pendingFilters]);

  const handleFiltersChange = useCallback(
    ({ filters }: TableFiltersChangeEvent) => {
      setIsLoading(true);
      setPendingFilters(filters);
    },
    [],
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {errorMessage && <Typography variant="body1">{errorMessage}</Typography>}
      <Table
        rows={tableRows}
        columns={tableColumns}
        isLoading={isLoading}
        onChange={handleFiltersChange}
      />
    </Box>
  );
}

export default App;
