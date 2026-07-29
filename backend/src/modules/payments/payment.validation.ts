import type { CreatePaymentRequest } from "./payment.types.js";
import { TransactionType } from "@prisma/client";

export function validatePaymentRequest(
  request: CreatePaymentRequest,
): void {

  if (!request.idempotencyKey) {
    throw new Error("Idempotency key is required.");
  }

  if (request.transactionType === TransactionType.REVERSAL) {
    if (!request.transactionIdToReverse) {
      throw new Error(
        "transactionIdToReverse is required.",
      );
    }

    return;
  }

  if (request.amount <= 0n) {
    throw new Error(
      "Payment amount must be greater than zero.",
    );
  }

  if (!request.toAccountId) {
    throw new Error(
      "Recipient account is required.",
    );
  }
}