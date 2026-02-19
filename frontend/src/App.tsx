import { Box, Typography } from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import {
  Table,
  type TableColumn,
  type TablePagination,
  type TableRow,
} from "./components/Table";
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
  const [totalRows, setTotalRows] = useState<number>(0);
  const [pendingFilters, setPendingFilters] = useState<
    TableAppliedFilter[] | null
  >(null);
  const [filters, setFilters] = useState<TableAppliedFilter[]>([]);
  const [pagination, setPagination] = useState<TablePagination>({
    page: 0,
    pageSize: 25,
  });

  const fetchRows = useCallback(
    (
      appliedFilters: TableAppliedFilter[],
      { page, pageSize }: TablePagination,
    ) => {
      getTableRows({
        filters: appliedFilters,
        page: page + 1,
        size: pageSize,
      })
        .then(({ rows, total }) => {
          setErrorMessage(null);
          setTableRows(rows);
          setTotalRows(total);
        })
        .catch((error: Error) => {
          setErrorMessage(error.message);
        })
        .finally(() => {
          setIsLoading(false);
        });
    },
    [],
  );

  useEffect(() => {
    getTableColumns()
      .then((columns) => {
        setErrorMessage(null);
        setTableColumns(columns);
      })
      .catch((error: Error) => {
        setErrorMessage(error.message);
      });
  }, []);

  useEffect(() => {
    fetchRows(filters, pagination);
  }, [fetchRows, filters, pagination]);

  useEffect(() => {
    if (pendingFilters === null) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setFilters(pendingFilters);
      setPagination((currentModel) => ({
        ...currentModel,
        page: 0,
      }));
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [pendingFilters]);

  const handleFiltersChange = useCallback(
    ({ filters }: TableFiltersChangeEvent) => {
      setIsLoading(true);
      setPendingFilters(filters);
    },
    [],
  );

  const handlePaginationChange = useCallback((model: TablePagination) => {
    setIsLoading(true);
    setPagination(model);
  }, []);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {errorMessage && <Typography variant="body1">{errorMessage}</Typography>}
      <Table
        rows={tableRows}
        columns={tableColumns}
        rowCount={totalRows}
        pagination={pagination}
        onPaginationChange={handlePaginationChange}
        isLoading={isLoading}
        onChange={handleFiltersChange}
      />
    </Box>
  );
}

export default App;
