import { isValid, parse, parseISO } from "date-fns";
import { camelCase } from "lodash-es";

import { FieldType } from "../types/schema.js";

export function buildFieldName(displayName: string): string {
  return camelCase(displayName);
}

export function normalizeNullable(value: unknown): unknown {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string" && value.trim() === "") {
    return null;
  }

  return value;
}

export function normalizeText(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }
  return String(value);
}

export function parseBooleanLike(value: unknown): boolean | null {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim().toLowerCase();

  if (normalizedValue === "true") {
    return true;
  }

  if (normalizedValue === "false") {
    return false;
  }

  return null;
}

export function parseDateLike(value: unknown): Date | null {
  if (value instanceof Date) {
    return isValid(value) ? value : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim();
  if (normalizedValue === "") {
    return null;
  }

  const isoDate = parseISO(normalizedValue);
  if (isValid(isoDate)) {
    return isoDate;
  }

  return parseDateToKnownFormats(normalizedValue);
}

export function parseNumberLike(
  value: unknown,
): null | { type: FieldType.FLOAT | FieldType.INTEGER; value: number } {
  if (typeof value === "number" && Number.isFinite(value)) {
    return {
      type: Number.isInteger(value) ? FieldType.INTEGER : FieldType.FLOAT,
      value,
    };
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim();
  if (normalizedValue === "") {
    return null;
  }

  const parsedValue = Number(normalizedValue);
  // Using isFinite here lets us filter out NaN (and also positive and negative Inifity)
  if (!Number.isFinite(parsedValue)) {
    return null;
  }

  return {
    type: Number.isInteger(parsedValue) ? FieldType.INTEGER : FieldType.FLOAT,
    value: parsedValue,
  };
}

function parseDateToKnownFormats(value: string): Date | null {
  const formats = [
    // ISO timestamp with a space instead of T
    "yyyy-MM-dd HH:mm:ss",
    // Date-only ISO form.
    "yyyy-MM-dd",
    // Day-first slash format, common in EU data
    "dd/MM/yyyy",
    // Same as above but single-digit day/month allowed
    "d/M/yyyy",
    // Day-first with dashes
    "dd-MM-yyyy",
    // Single-digit day/month with dashes
    "d-M-yyyy",
  ];

  for (const format of formats) {
    const parsedDate = parse(value, format, new Date());

    if (isValid(parsedDate)) {
      return parsedDate;
    }
  }

  return null;
}
