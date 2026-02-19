# Dublin Bikes Challenge

This repository contains my solution for Noloco's take-home exercise: fetch the Dublin Bikes dataset, derive a normalized schema dynamically, and expose queryable data through an API. It also includes a small React UI to explore the data and apply filters.

## Implemented scope

- `GET /schema` returns dynamically inferred field metadata.
- `POST /data` returns paginated standardized rows and supports filtering and ordering.
- Field names are normalized to camelCase.
- Values are normalized to the most reasonable type.
- Frontend table that:
  - Fetches schema/data
  - Renders columns dynamically
  - Lets users apply a single filter (`eq`, `gt`, `lt`)
  - Supports server-side pagination (`page`, `size`, `total`)
  - Supports server-side sorting (`orderBy`)

## It Works On My Machine (proof)

### Quick walkthrough

[![Watch here](https://img.youtube.com/vi/3u-i01mxtoM/0.jpg)](https://www.youtube.com/watch?v=3u-i01mxtoM)


### Filtering

[![Watch here](https://img.youtube.com/vi/vRXP3Xl2uZY/0.jpg)](https://www.youtube.com/watch?v=vRXP3Xl2uZY)


### Sorting

[![Watch here](https://img.youtube.com/vi/adCY1pOv5pY/0.jpg)](https://www.youtube.com/watch?v=adCY1pOv5pY)


### How it all works together

[![Watch here](https://img.youtube.com/vi/gPA0DaTcw-w/0.jpg)](https://www.youtube.com/watch?v=gPA0DaTcw-w)


## Tech stack

### Backend

- Node.js + Express + TypeScript
- `date-fns` (date parsing)
- `lodash-es` (`camelCase`)

### Frontend

- React + TypeScript + Vite
- MUI + MUI DataGrid

## Code quality

- ESLint is configured for both backend and frontend, with `npm run lint:fix` available in each package.

## Technical choices and tradeoffs

- I used an in-memory cache for dataset rows and the derived schema to keep the solution simple and fast without adding persistence.
- Schema inference is fully dynamic and normalizes noisy values (`null`/empty, booleans, numbers, dates), but `OPTION` detection is heuristic-based and can be imperfect for edge cases.
- I scoped filtering to a single field (`where` with one operator) to keep validation and behavior predictable within the timebox.
- The API returns parsed and standardized camelCase values in `/data` (not the raw third-party payload), so the frontend can stay simple and schema-driven.
- I deliberately kept frontend and backend models separated (even where they currently match) so each side can evolve independently without tight coupling.

## How it works

### 1) Dataset loading

Backend fetches `https://app-media.noloco.app/noloco/dublin-bikes.json` and keeps rows in memory for the process lifetime.

### 2) Dynamic schema inference

For each dataset key (display name), the backend computes:

- `display`: original key
- `name`: camelCase normalized name
- `type`: one of `TEXT | INTEGER | FLOAT | DATE | BOOLEAN | OPTION`
- `options`: distinct values when inferred as `OPTION`

Type inference order per field:

1. `BOOLEAN` (all non-null values parse as true/false)
2. Numeric (`INTEGER` / `FLOAT`)
3. `DATE`
4. `OPTION` (text-only categorical heuristic)
5. fallback `TEXT`

Normalization details:

- `null`, `undefined`, and empty strings become `null`
- booleans accept case-insensitive `"true"` / `"false"`
- numbers parse from numeric strings (via `Number`)
- dates parse ISO + known formats (`yyyy-MM-dd HH:mm:ss`, `yyyy-MM-dd`, `dd/MM/yyyy`, `d/M/yyyy`, `dd-MM-yyyy`, `d-M-yyyy`)

### 3) Data standardization + filtering + ordering + pagination

`POST /data` returns rows keyed by standardized schema names, not original display names.

It also returns values parsed according to the inferred schema, so inconsistent source values are normalized before they reach the UI (for example, `"FALSE"`/`true` style booleans and numeric strings like coordinates).

Supported request shape:

```json
{
  "page": 1,
  "size": 25,
  "orderBy": {
    "field": "availableBikes",
    "direction": "desc"
  },
  "where": {
    "<fieldName>": { "<operator>": "<value>" }
  }
}
```

Supported operators:

- `eq` for all field types
- `gt`, `lt` only for `INTEGER`, `FLOAT`, `DATE`

Current behavior/constraints:

- Only one field filter at a time
- Sorting supports one field at a time via `orderBy`
- Invalid payloads/operators/field names return `400`
- Date values are internally handled as `Date` and serialized as ISO strings in JSON responses
- Pagination defaults are `page=1` and `size=25` (max size `100`)

## API examples

### `GET /schema`

```bash
curl http://localhost:3000/schema
```

Example response item:

```json
{
  "display": "Available Bikes",
  "name": "availableBikes",
  "type": "INTEGER",
  "options": []
}
```

### `POST /data` (no filters)

```bash
curl -X POST http://localhost:3000/data \
  -H "Content-Type: application/json" \
  -d '{
    "page": 1,
    "size": 25,
    "orderBy": {
      "field": "availableBikes",
      "direction": "desc"
    }
  }'
```

Example response:

```json
{
  "data": [],
  "page": 1,
  "size": 25,
  "total": 111
}
```

### `POST /data` (filtered)

```bash
curl -X POST http://localhost:3000/data \
  -H "Content-Type: application/json" \
  -d '{
    "page": 1,
    "size": 10,
    "where": {
      "availableBikes": { "gt": 10 }
    }
  }'
```

## Frontend behavior

The React app:

- Fetches `/schema` to build dynamic columns
- Fetches `/data` for rows
- Maps schema types to DataGrid column types (`number`, `dateTime`, `boolean`, `singleSelect`, `string`)
- Exposes a simple filter bar with field/operator/value inputs
- Debounces filter requests (~300ms)
- Uses server-side pagination via `page`, `size`, and `total`
- Uses server-side sorting via `orderBy`

Base API URL is currently hardcoded to `http://localhost:3000`.

## Running locally

### Prerequisites

- Node.js `v24.12.0` (see `backend/.nvmrc` and `frontend/.nvmrc`)

### 1) Start backend

```bash
cd backend
npm install
npm run dev
```

### 2) Start frontend (new terminal)

```bash
cd frontend
npm install
npm run dev
```

Then open the Vite URL shown in terminal (usually `http://localhost:5173`).

### Production builds

```bash
cd backend && npm run build
cd frontend && npm run build
```

## Project structure

- `backend/src/services`: dataset fetch, schema derivation, and data filtering logic
- `backend/src/routes`: API endpoints
- `backend/src/utils/normalize.ts`: normalization/parsing helpers
- `frontend/src/services`: API calls + schema/data to table mapping
- `frontend/src/components`: DataGrid and filter controls

## If I had more time

- Prioritize automated tests first for both backend and frontend. There are several moving parts in schema inference, normalization, filtering, and UI mapping, so tests are essential to catch regressions early.
- Add multiple-field filtering with `AND` logic (and optional `OR`)
- Add `not` operator and nested conditions
- Add `GET /data/:id`, update, and delete endpoints
- Move frontend API base URL to environment config
