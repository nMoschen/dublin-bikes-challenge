import { Box, Typography } from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import {
  Table,
  type TableColumn,
  type TablePagination,
  type TableRow,
  type TableSorting,
} from "./components/Table";
import { getTableColumns, getTableRows } from "./services/table.service";
import type {
  TableFilter,
  TableFiltersChangeEvent,
} from "./components/TableFilters";

function App() {
  const [tableColumns, setTableColumns] = useState<TableColumn[]>([]);
  const [tableRows, setTableRows] = useState<TableRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [totalRows, setTotalRows] = useState<number>(0);
  const [pendingFilters, setPendingFilters] = useState<TableFilter[] | null>(
    null,
  );
  const [filters, setFilters] = useState<TableFilter[]>([]);
  const [pagination, setPagination] = useState<TablePagination>({
    page: 0,
    pageSize: 25,
  });
  const [sorting, setSorting] = useState<TableSorting>([]);

  const fetchRows = useCallback(
    (
      appliedFilters: TableFilter[],
      appliedPagination: TablePagination,
      appliedSorting: TableSorting,
    ) => {
      getTableRows({
        filters: appliedFilters,
        page: appliedPagination.page + 1,
        size: appliedPagination.pageSize,
        sorting: appliedSorting,
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
    fetchRows(filters, pagination, sorting);
  }, [fetchRows, filters, pagination, sorting]);

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

  const handleSortingChange = useCallback((model: TableSorting) => {
    setIsLoading(true);
    setSorting(model);
    setPagination((currentModel) => ({
      ...currentModel,
      page: 0,
    }));
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
        sorting={sorting}
        onSortingChange={handleSortingChange}
        isLoading={isLoading}
        onChange={handleFiltersChange}
      />
    </Box>
  );
}

export default App;
