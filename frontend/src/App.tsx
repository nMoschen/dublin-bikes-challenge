import { Box, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { Table, type TableColumn, type TableRow } from "./components/Table";
import { getTableData } from "./services/table.service";

function App() {
  const [tableColumns, setTableColumns] = useState<TableColumn[]>([]);
  const [tableRows, setTableRows] = useState<TableRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    getTableData()
      .then(({ columns, rows }) => {
        setErrorMessage(null);
        setTableColumns(columns);
        setTableRows(rows);
      })
      .catch((error: Error) => {
        setErrorMessage(error.message);
        setTableColumns([]);
        setTableRows([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {errorMessage && <Typography variant="body1">{errorMessage}</Typography>}
      {!errorMessage && (
        <Table rows={tableRows} columns={tableColumns} isLoading={isLoading} />
      )}
    </Box>
  );
}

export default App;
