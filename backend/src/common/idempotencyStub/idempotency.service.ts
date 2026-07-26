import crypto from "crypto";
import type { IdempotencyResult } from "./idempotency.types.js";

export function generateIdempotencyKey(): string {
  return crypto.randomUUID();
}

export function validateIdempotencyKey(
  key?: string,
): IdempotencyResult {
  return {
    key: key ?? generateIdempotencyKey(),
    isDuplicate: false,
  };
}