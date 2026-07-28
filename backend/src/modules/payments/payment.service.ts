import crypto from "crypto";
import {
  AccountStatus,
  EntryType,
  IdempotencyStatus,
  Prisma,
  SystemAccountType,
  TransactionEventType,
  TransactionStatus,
  type Transaction,
} from "@prisma/client";
import { logger } from "../../common/config/logger.js";
import { prisma } from "../../PrismaClient/prismaclient.js";
import {
  getAccountByIdTx,
  getAccountByUserIdTx,
} from "../account/account.database.js";
import {
  createIdempotencyReservationTx,
  getIdempotencyByKeyTx,
  reclaimIdempotencyReservationTx,
  completeIdempotencyTx,
  failIdempotencyTx,
} from "../idempotency/idempotency.database.js";
import { postJournal } from "../Ledger/ledger.service.js";
import type { PostJournalRequest } from "../Ledger/ledger.types.js";
import { SYSTEM_ACCOUNTS } from "../payments/systemAccounts.js";
import {
  createTransaction,
  createTransactionEvent,
  markTransactionSuccessful,
  markTransactionFailed,
  markTransactionReversed,
} from "../Transactions/transaction.database.js";
import type {
  CreatePaymentRequest,
  PaymentOptions,
  PaymentReservation,
} from "./payment.types.js";
import { validatePaymentRequest } from "./payment.validation.js";

export async function createPayment(
  authenticatedUserId: string,
  request: CreatePaymentRequest,
  options: PaymentOptions,
) {
  console.log("REQUEST =", request);
  validatePaymentRequest(request);

  const reservation = await reservePayment(authenticatedUserId, request);

  // Handle completed retry
  if (reservation.type === "COMPLETED") {
    return reservation.response;
  }

  // From here onwards reservation.type === "NEW"
  try {
    return await executePayment(
      reservation.transaction,
      authenticatedUserId,
      request,
      options,
    );
  } catch (error) {
    try {
      await failPayment(reservation.transaction, error);
    } catch (finalizationError) {
      logger.error(
        `Failed to finalize payment failure: ${String(finalizationError)}`,
      );
    }

    throw error;
  }
}

//create payment TRANSACTION A - INITIATION
async function reservePayment(
  authenticatedUserId: string,
  request: CreatePaymentRequest,
): Promise<PaymentReservation> {
  const requestHash = generateRequestHash(request);

  const expiresAt = new Date(
    Date.now() + 15 * 60 * 1000,
  );

  try {
    return await prisma.$transaction(async (tx) => {
      await createIdempotencyReservationTx(
        tx,
        request.idempotencyKey,
        requestHash,
        expiresAt,
      );

      return createPendingTransaction(
        tx,
        authenticatedUserId,
        request,
      );
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      // Previous transaction has already been rolled back.
      // Start a brand-new transaction to inspect the existing reservation.
      return prisma.$transaction(async (tx) => {
        return handleDuplicateReservation(
          tx,
          authenticatedUserId,
          request,
          requestHash,
          expiresAt,
        );
      });
    }

    throw error;
  }
}

//create payment TRANSACTION B - PAYMENT LOGIC AND other stuff
async function executePayment(
  transaction: Transaction,
  authenticatedUserId: string,
  request: CreatePaymentRequest,
  options: PaymentOptions,
) {
  return prisma.$transaction(async (tx) => {
    const sender = await loadSenderAccount(tx, authenticatedUserId);

    const recipient = await loadRecipientAccount(tx, request.toAccountId);

    validateBusinessRules(sender, recipient);

    const journal = buildJournalEntries(
      transaction.id,
      sender.id,
      recipient.id,
      request,
      options,
    );
console.log(journal);
    const ledgerEntries = await postJournal(tx, journal);

    await markTransactionSuccessful(tx, transaction.id);

    await createTransactionEvent(
      tx,
      transaction.id,
      TransactionEventType.PAYMENT_SUCCEEDED,
    );
    const response = {
      transactionId: transaction.id,
      status: TransactionStatus.SUCCESS,
    };

    const completed = await completeIdempotencyTx(
      tx,
      request.idempotencyKey,
      response,
    );

    if (completed.count === 0) {
      throw new Error("Failed to finalize idempotency record.");
    }

    return response;
  });
}

//create payment TRANSACTION C - FAILURE MODE
async function failPayment(transaction: Transaction, error: unknown) {
  return prisma.$transaction(async (tx) => {
    const failureReason =
      error instanceof Error ? error.message : "Unknown payment failure.";

    const updated = await markTransactionFailed(
      tx,
      transaction.id,
      failureReason,
    );

    // Somebody else already finalized it.
    if (updated.count === 0) {
      return;
    }

    await createTransactionEvent(
      tx,
      transaction.id,
      TransactionEventType.PAYMENT_FAILED,
    );

    const failedIdempotency = await failIdempotencyTx(
      tx,
      transaction.idempotencyKey,
    );

    if (failedIdempotency.count === 0) {
      return ;
    }
  });
}

//helpers
async function loadSenderAccount(
  tx: Prisma.TransactionClient,
  authenticatedUserId: string,
) {
  const account = await getAccountByUserIdTx(tx, authenticatedUserId);

  if (!account) {
    throw new Error("Sender account not found.");
  }

  return account;
}

async function loadRecipientAccount(
  tx: Prisma.TransactionClient,
  accountId: string,
) {
  const account = await getAccountByIdTx(tx, accountId);

  if (!account) {
    throw new Error("Recipient account not found.");
  }

  return account;
}

function validateBusinessRules(
  sender: Awaited<ReturnType<typeof getAccountByUserIdTx>>,
  recipient: Awaited<ReturnType<typeof getAccountByIdTx>>,
) {
  if (!sender || !recipient) {
    throw new Error("Invalid account.");
  }

  if (sender.status === AccountStatus.FROZEN) {
    throw new Error("Sender account is frozen.");
  }

  if (recipient.status === AccountStatus.FROZEN) {
    throw new Error("Recipient account is frozen.");
  }

  if (sender.status === AccountStatus.CLOSE) {
    throw new Error("Sender account is closed.");
  }

  if (recipient.status === AccountStatus.CLOSE) {
    throw new Error("Recipient account is closed.");
  }

  if (sender.currency !== recipient.currency) {
    throw new Error("Cross-currency payments are not supported.");
  }
}

function addEntry(
  entries: PostJournalRequest["entries"],
  accountId: string,
  entryType: EntryType,
  amount: bigint,
) {
  if (amount <= 0n) {
    return;
  }

  entries.push({
    accountId,
    entryType,
    amount,
  });
}

function buildJournalEntries(
  transactionId: string,
  senderAccountId: string,
  recipientAccountId: string,
  request: CreatePaymentRequest,
  options: PaymentOptions,
): PostJournalRequest {
  const entries: PostJournalRequest["entries"] = [];

  const platformFee = options.platformFee ?? 0n;
  const tax = options.tax ?? 0n;

  // Sender pays:
  // amount + platform fee + tax
  const senderDebit = request.amount + platformFee + tax;
console.log({
  requestAmount: request.amount,
  senderDebit,
  requestAmountType: typeof request.amount,
  senderDebitType: typeof senderDebit,
  platformFeeType: typeof platformFee,
  taxType: typeof tax,
});
  addEntry(entries, senderAccountId, EntryType.DEBIT, senderDebit);

  addEntry(entries, recipientAccountId, EntryType.CREDIT, request.amount);

  addEntry(
    entries,
    SystemAccountType.FEE_REVENUE,
    EntryType.CREDIT,
    platformFee,
  );

  addEntry(entries, SYSTEM_ACCOUNTS.TREASURY, EntryType.CREDIT, tax);

  return {
    transactionId,
    lockingStrategy: request.lockingStrategy,
    entries,
  };
}

function generateRequestHash(request: CreatePaymentRequest): string {
  return crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        toAccountId: request.toAccountId,
        amount: request.amount.toString(),
        transactionType: request.transactionType,
        lockingStrategy: request.lockingStrategy,
      }),
    )
    .digest("hex");
}

async function createPendingTransaction(
  tx: Prisma.TransactionClient,
  authenticatedUserId: string,
  request: CreatePaymentRequest,
): Promise<PaymentReservation> {
  const transaction = await createTransaction(tx, {
    type: request.transactionType,
    initiatorUserId: authenticatedUserId,
    amount: request.amount,
    idempotencyKey: request.idempotencyKey,
    lockingStrategy: request.lockingStrategy,
    status: TransactionStatus.PENDING,
  });

  await createTransactionEvent(
    tx,
    transaction.id,
    TransactionEventType.PAYMENT_INITIATED,
  );

  return {
    type: "NEW",
    transaction,
  };
}

function verifyRequestHash(storedHash: string, currentHash: string): void {
  if (storedHash !== currentHash) {
    throw new Error("Idempotency key reused with a different request payload.");
  }
}

async function handleDuplicateReservation(
  tx: Prisma.TransactionClient,
  authenticatedUserId: string,
  request: CreatePaymentRequest,
  requestHash: string,
  expiresAt: Date,
): Promise<PaymentReservation> {
  const existing = await getIdempotencyByKeyTx(tx, request.idempotencyKey);

  if (!existing) {
    throw new Error("Idempotency reservation disappeared.");
  }

  verifyRequestHash(existing.requestHash, requestHash);

  switch (existing.status) {
    case IdempotencyStatus.COMPLETED:
      return {
        type: "COMPLETED",
        response: existing.responseBody,
      };

    case IdempotencyStatus.IN_PROGRESS: {
      // Still being processed by another request
      if (existing.expiresAt > new Date()) {
        throw new Error("Payment is already being processed.");
      }

      // Expired reservation -> reclaim it
      const reclaimed = await reclaimIdempotencyReservationTx(
        tx,
        request.idempotencyKey,
        requestHash,
        expiresAt,
      );

      if (reclaimed.count === 0) {
        throw new Error("Failed to reclaim idempotency reservation.");
      }

      return createPendingTransaction(tx, authenticatedUserId, request);
    }

    case IdempotencyStatus.FAILED: {
      // Previous attempt failed -> reclaim reservation
      const reclaimed = await reclaimIdempotencyReservationTx(
        tx,
        request.idempotencyKey,
        requestHash,
        expiresAt,
      );

      if (reclaimed.count === 0) {
        throw new Error("Failed to reclaim idempotency reservation.");
      }

      return createPendingTransaction(tx, authenticatedUserId, request);
    }

    default:
      throw new Error("Unknown idempotency state.");
  }
}

// export async function createPayment(
//   authenticatedUserId: string,
//   request: CreatePaymentRequest,
//   options: PaymentOptions,
// ) {
//   validatePaymentRequest(request);

//   // Transaction A
//   // TODO: Reserve Idempotency

//   return prisma.$transaction(async (tx) => {
//     const sender = await loadSenderAccount(tx, authenticatedUserId);

//     const recipient = await loadRecipientAccount(tx, request.toAccountId);

//     validateBusinessRules(sender, recipient);

//     const transaction = await createTransaction(tx, {
//       type: request.transactionType,
//       initiatorUserId: authenticatedUserId,
//       amount: request.amount,
//       idempotencyKey: request.idempotencyKey,
//       lockingStrategy: request.lockingStrategy,
//       status: TransactionStatus.PENDING,
//     });

//     await createTransactionEvent(
//       tx,
//       transaction.id,
//       TransactionEventType.PAYMENT_INITIATED,
//     );

//     const journal = buildJournalEntries(
//       transaction.id,
//       sender.id,
//       recipient.id,
//       request,
//       options,
//     );

//     const ledgerEntries = await postJournal(tx, journal);

//     await markTransactionSuccessful(tx, transaction.id);

//     await createTransactionEvent(
//       tx,
//       transaction.id,
//       TransactionEventType.PAYMENT_SUCCEEDED,
//     );

//     // TODO:
//     return {
//       transactionId: transaction.id,
//       status: TransactionStatus.SUCCESS,
//     };
//     // completeIdempotency()
//   });
// }
