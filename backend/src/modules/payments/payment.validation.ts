import type { CreatePaymentRequest } from "./payment.types.js";

export function validatePaymentRequest(
  request: CreatePaymentRequest,
): void {
  if (request.amount <= 0n) {
    throw new Error(
      "Payment amount must be greater than zero.",
    );
  }

  if (!request.toAccountId) {
    throw new Error("Recipient account is required.");
  }

  if (!request.idempotencyKey) {
    throw new Error("Idempotency key is required.");
  }
}