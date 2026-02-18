import { RawRow } from "../types/schema.js";

const DUBLIN_BIKES_URL =
  "https://app-media.noloco.app/noloco/dublin-bikes.json";

let cachedRows: null | RawRow[] = null;
let inflightRequest: null | Promise<RawRow[]> = null;

export async function getDatasetRows(): Promise<RawRow[]> {
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

async function fetchRows(): Promise<RawRow[]> {
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

  const rawRows = payload.filter(isValidRawRow);
  if (rawRows.length !== payload.length) {
    throw new Error("Dataset must be an array of JSON objects");
  }

  return rawRows;
}

function isValidRawRow(value: unknown): value is RawRow {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
