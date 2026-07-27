import { prisma } from "../../PrismaClient/prismaclient.js";
import type { CreatePaymentRequest, PaymentOptions } from "./payment.types.js";
import { validatePaymentRequest } from "./payment.validation.js";
import {
  Prisma,
  AccountStatus,
  TransactionStatus,
  TransactionEventType,
  SystemAccountType,
} from "@prisma/client";
import { SYSTEM_ACCOUNTS } from "../payments/systemAccounts.js";
import {
  getAccountByIdTx,
  getAccountByUserIdTx,
} from "../account/account.database.js";
import {
  createTransaction,
  createTransactionEvent,
} from "../Transactions/transaction.database.js";
import type { PostJournalRequest } from "../Ledger/ledger.types.js";
import { EntryType } from "@prisma/client";
import { postJournal } from "../Ledger/ledger.service.js";
import { markTransactionSuccessful } from "../Transactions/transaction.database.js";
import {logger} from "../../common/config/logger.js";
import type { Transaction } from "@prisma/client";

export async function createPayment(
  authenticatedUserId: string,
  request: CreatePaymentRequest,
  options: PaymentOptions,
) {
  validatePaymentRequest(request);

  const reservation =
    await reservePayment(
      authenticatedUserId,
      request,
    );

  try {
    return await executePayment(
      reservation.transaction,
      authenticatedUserId,
      request,
      options,
    );
  } catch (error) {
  try {
    await failPayment(
    reservation.transaction.id,
    error,
);
  } catch (finalizationError) {
    logger.error(
      "Failed to finalize payment failure.\n"+finalizationError,
    );
  }

  throw error;
}
}

//create payment TRANSACTION A - INITIATION
async function reservePayment(
  authenticatedUserId: string,
  request: CreatePaymentRequest,
) {
  return prisma.$transaction(async (tx) => {

    // TODO
    // reserveIdempotency(tx, ...)

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
      transaction,
      // idempotency
    };
  });
}
//create payment TRANSACTION B - PAYMENT LOGIC AND other stuff
async function executePayment(
  transaction: Transaction,
  authenticatedUserId: string,
  request: CreatePaymentRequest,
  options: PaymentOptions,
) {
  return prisma.$transaction(async (tx) => {

    const sender = await loadSenderAccount(
      tx,
      authenticatedUserId,
    );

    const recipient = await loadRecipientAccount(
      tx,
      request.toAccountId,
    );

    validateBusinessRules(
      sender,
      recipient,
    );

    const journal = buildJournalEntries(
      transaction.id,
      sender.id,
      recipient.id,
      request,
      options,
    );

    const ledgerEntries = await postJournal(
      tx,
      journal,
    );

    await markTransactionSuccessful(
      tx,
      transaction.id,
    );

    await createTransactionEvent(
      tx,
      transaction.id,
      TransactionEventType.PAYMENT_SUCCEEDED,
    );

    // TODO
    // completeIdempotency(tx,...)

    return {
      transactionId: transaction.id,
      status: TransactionStatus.SUCCESS,
      ledgerEntries,
    };
  });
}
//create payment TRANSACTION C - FAILURE MODE
async function failPayment(
    transactionId: string,
    error: unknown,
){

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

  addEntry(entries, senderAccountId, EntryType.DEBIT, senderDebit);

  addEntry(entries, recipientAccountId, EntryType.CREDIT, request.amount);

  addEntry(
    entries,
     SystemAccountType.FEE_REVENUE,
    EntryType.CREDIT,
    platformFee,
  );

  addEntry(entries,  SYSTEM_ACCOUNTS.TREASURY, EntryType.CREDIT, tax);

  return {
    transactionId,
    lockingStrategy: request.lockingStrategy,
    entries,
  };
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