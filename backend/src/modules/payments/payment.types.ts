import {
  LockingStrategy,
  TransactionType,
} from "@prisma/client";

export interface CreatePaymentRequest {
  toAccountId: string;

  amount: bigint;

  idempotencyKey: string;

  lockingStrategy: LockingStrategy;

  transactionType: TransactionType;
}

export interface PaymentOptions {

    platformFee?: bigint;

    discount?: bigint;
 cashback?: bigint;
    tax?: bigint;
}

export interface CreatePaymentResponse {
  transactionId: string;

  status: string;
}

export interface PaymentContext {
    transactionId: string;

    senderAccountId: string;

    receiverAccountId: string;

    request: CreatePaymentRequest;

    options: PaymentOptions;
}


import type { Transaction } from "@prisma/client";

export type PaymentReservation =
  | {
      type: "NEW";
      transaction: Transaction;
    }
  | {
      type: "COMPLETED";
      response: unknown;
    };
