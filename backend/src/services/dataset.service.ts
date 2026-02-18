import { RawDatasetRow } from "../types/schema.js";

const DUBLIN_BIKES_URL =
  "https://app-media.noloco.app/noloco/dublin-bikes.json";

let cachedRows: null | RawDatasetRow[] = null;
let inflightRequest: null | Promise<RawDatasetRow[]> = null;

export async function getDatasetRows(): Promise<RawDatasetRow[]> {
  if (cachedRows !== null) {
    return cachedRows;
  }

  if (inflightRequest !== null) {
    return inflightRequest;
  }

  inflightRequest = fetchRows()
    .then((rows) => {
      cachedRows = rows;
      return rows;
    })
    .finally(() => {
      inflightRequest = null;
    });

  return inflightRequest;
}

async function fetchRows(): Promise<RawDatasetRow[]> {
  const response = await fetch(DUBLIN_BIKES_URL);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch dataset. HTTP status ${String(response.status)}`,
    );
  }

  const payload: unknown = await response.json();
  if (!Array.isArray(payload)) {
    throw new Error("Dataset is not an array");
  }

  const datasetRows = payload.filter(isDatasetRow);
  if (datasetRows.length !== payload.length) {
    throw new Error("Dataset must be an array of JSON objects");
  }

  return datasetRows;
}

function isDatasetRow(value: unknown): value is RawDatasetRow {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
