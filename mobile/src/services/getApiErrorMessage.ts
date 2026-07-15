import { ApiError } from "./api";

type ErrorRecord = Record<string, unknown>;

function extractMessage(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const message = extractMessage(item);

      if (message) {
        return message;
      }
    }
  }

  if (value && typeof value === "object") {
    const record = value as ErrorRecord;

    if (typeof record.detail === "string") {
      return record.detail;
    }

    for (const nestedValue of Object.values(record)) {
      const message = extractMessage(nestedValue);

      if (message) {
        return message;
      }
    }
  }

  return null;
}

export function getApiErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (error instanceof ApiError) {
    return extractMessage(error.data) ?? fallback;
  }

  if (error instanceof Error) {
    return error.message || fallback;
  }

  return fallback;
}