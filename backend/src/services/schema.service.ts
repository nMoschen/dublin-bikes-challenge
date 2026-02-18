import { Field, FieldType, RawDatasetRow } from "../types/schema.js";
import {
  buildFieldName,
  normalizeNullable,
  normalizeText,
  parseBooleanLike,
  parseDateLike,
  parseNumberLike,
} from "../utils/normalize.js";
import { getDatasetRows } from "./dataset.service.js";

interface FieldStats {
  readonly counts: Record<InferenceType, number>;
  readonly nonNullCount: number;
  readonly options: string[];
}

type InferenceType =
  | FieldType.BOOLEAN
  | FieldType.DATE
  | FieldType.FLOAT
  | FieldType.INTEGER
  | FieldType.TEXT;

let cachedSchema: Field[] | null = null;

export function deriveSchema(rows: RawDatasetRow[]): Field[] {
  const displayNames = collectDisplayNames(rows);

  return displayNames.map((displayName) => {
    const fieldName = buildFieldName(displayName);
    const fieldStats = buildFieldStats(displayName, rows);
    const fieldType = inferFieldType(fieldStats);

    return {
      display: displayName,
      name: fieldName,
      options: fieldType === FieldType.OPTION ? fieldStats.options : [],
      type: fieldType,
    };
  });
}

export async function getSchema(): Promise<Field[]> {
  if (cachedSchema !== null) {
    return cachedSchema;
  }

  const rows = await getDatasetRows();
  cachedSchema = deriveSchema(rows);

  return cachedSchema;
}

/**
 * For a given attribute, it generates the stats required for schema inference.
 * For example: for attribute "Available Bikes", it scans all rows and computes:
 * - nonNullCount: how many values are actually present
 * - counts: how many values look like BOOLEAN, INTEGER, FLOAT, DATE, or fallback TEXT
 * - options: unique text values (for possible OPTION type)
 */
function buildFieldStats(
  displayName: string,
  rows: RawDatasetRow[],
): FieldStats {
  const counts: Record<InferenceType, number> = {
    [FieldType.BOOLEAN]: 0,
    [FieldType.DATE]: 0,
    [FieldType.FLOAT]: 0,
    [FieldType.INTEGER]: 0,
    [FieldType.TEXT]: 0,
  };
  const optionMap = new Map<string, string>();
  let nonNullCount = 0;

  for (const row of rows) {
    const rawValue = row[displayName];

    const normalizedValue = normalizeNullable(rawValue);
    if (normalizedValue === null) {
      continue;
    }

    nonNullCount += 1;

    const booleanValue = parseBooleanLike(normalizedValue);
    if (booleanValue !== null) {
      counts[FieldType.BOOLEAN] += 1;
      continue;
    }

    const numericValue = parseNumberLike(normalizedValue);
    if (numericValue !== null) {
      counts[numericValue.type] += 1;
      continue;
    }

    const dateValue = parseDateLike(normalizedValue);
    if (dateValue !== null) {
      counts[FieldType.DATE] += 1;
      continue;
    }

    const textValue = normalizeText(normalizedValue);
    const optionKey = textValue.toLowerCase();

    if (!optionMap.has(optionKey)) {
      optionMap.set(optionKey, textValue);
    }

    counts[FieldType.TEXT] += 1;
  }

  const options = [...optionMap.values()].sort((a, b) => a.localeCompare(b));

  return {
    counts,
    nonNullCount,
    options,
  };
}

/**
 * Collects all attributes present in a raw dataset row (AKA display name)
 */
function collectDisplayNames(rows: RawDatasetRow[]): string[] {
  const seenDisplayNames = new Set<string>();
  const displayNames: string[] = [];

  for (const row of rows) {
    for (const displayName of Object.keys(row)) {
      if (!seenDisplayNames.has(displayName)) {
        seenDisplayNames.add(displayName);
        displayNames.push(displayName);
      }
    }
  }

  return displayNames;
}

/**
 * Infers the field type of a given attribute based on its stats.
 * For example: an attribute "Available Bikes" with only numeric count would end up in a field of type INTEGER.
 */
function inferFieldType(stats: FieldStats): FieldType {
  if (stats.nonNullCount === 0) {
    return FieldType.TEXT;
  }

  if (stats.counts[FieldType.BOOLEAN] === stats.nonNullCount) {
    return FieldType.BOOLEAN;
  }

  const numericCount =
    stats.counts[FieldType.INTEGER] + stats.counts[FieldType.FLOAT];

  if (numericCount === stats.nonNullCount) {
    return stats.counts[FieldType.FLOAT] > 0
      ? FieldType.FLOAT
      : FieldType.INTEGER;
  }

  if (stats.counts[FieldType.DATE] === stats.nonNullCount) {
    return FieldType.DATE;
  }

  if (isOptionField(stats)) {
    return FieldType.OPTION;
  }

  return FieldType.TEXT;
}

function isOptionField(stats: FieldStats): boolean {
  const hasTypedValues =
    stats.counts[FieldType.BOOLEAN] +
      stats.counts[FieldType.INTEGER] +
      stats.counts[FieldType.FLOAT] +
      stats.counts[FieldType.DATE] >
    0;

  const hasEnoughOptions = stats.counts[FieldType.TEXT] > 1;
  if (hasTypedValues || !hasEnoughOptions) {
    return false;
  }

  const distinctOptions = stats.options.length;
  const repetitionRatio = stats.counts[FieldType.TEXT] / distinctOptions;

  const maxOptionsThreshold = 20;
  const hasTooManyOptions = distinctOptions > maxOptionsThreshold;

  const minRepetitionRatioThreshold = 1.5;
  const hasCategoryLikeOptions = repetitionRatio >= minRepetitionRatioThreshold;

  return !hasTooManyOptions && hasCategoryLikeOptions;
}
