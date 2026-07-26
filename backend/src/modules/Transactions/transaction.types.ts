import {
  TransactionStatus,
  TransactionType,
  LockingStrategy
} from "@prisma/client";

export interface CreateTransactionInput {
  type: TransactionType;
  initiatorUserId: string;
  amount: bigint;
  currency?: string;
  idempotencyKey: string;
  status?: TransactionStatus;
  lockingStrategy: LockingStrategy;
}