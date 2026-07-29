import type { Request, Response ,NextFunction} from "express";

import {
  getTransactionById,
  getTransactionsByUserId,
  getTransactionsByStatus,
  getRecentTransactions,
  getTransactionEvents,
} from "./transaction.database.js";
import { serializeBigInt } from "../../common/config/serialiseBigInt.js";
import { TransactionStatus } from "@prisma/client";
import { TransactionType } from "@prisma/client";
import { LockingStrategy } from "@prisma/client";
import { createPayment } from "../payments/payment.service.js";
import { logger } from "../../common/config/logger.js";
import { randomUUID } from "crypto";
export const getTransactionByIdController = async (
  req: Request<{ transactionId: string }>,
  res: Response,
): Promise<Response> => {
  try {
    const { transactionId } = req.params;

    const transaction = await getTransactionById(
      transactionId,
    );

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found.",
      });
    }

    return res.status(200).json({
      success: true,
      transaction:serializeBigInt(transaction),
    });
  } catch (error) {
    logger.error(error);

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Internal Server Error",
    });
  }
};

export const getTransactionsByUserIdController = async (
  req: Request<{ userId: string }>,
  res: Response,
): Promise<Response> => {
  try {
    const { userId } = req.params;

    const transactions =
      await getTransactionsByUserId(userId);

    return res.status(200).json({
      success: true,
      transactions:serializeBigInt(transactions),
    });
  } catch (error) {
    logger.error(error);

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Internal Server Error",
    });
  }
};

export const getTransactionsByStatusController = async (
  req: Request<{ status: TransactionStatus }>,
  res: Response,
): Promise<Response> => {
  try {
    const { status } = req.params;

    const transactions =
      await getTransactionsByStatus(status);

    return res.status(200).json({
      success: true,
      transactions:serializeBigInt(transactions),
    });
  } catch (error) {
    logger.error(error);

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Internal Server Error",
    });
  }
};

export const getRecentTransactionsController = async (
  _req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const transactions =
      await getRecentTransactions();

    return res.status(200).json({
      success: true,
      transactions:serializeBigInt(transactions),
    });
  } catch (error) {
    logger.error(error);

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Internal Server Error",
    });
  }
};

export const getTransactionEventsController = async (
  req: Request<{ transactionId: string }>,
  res: Response,
): Promise<Response> => {
  try {
    const { transactionId } = req.params;

    const events =
      await getTransactionEvents(transactionId);

    return res.status(200).json({
      success: true,
      events,
    });
  } catch (error) {
    logger.error(error);

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Internal Server Error",
    });
  }
};

// admin.controller.ts

export async function reverseTransactionController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { transactionId } = req.body;

    if (!transactionId) {
      return res.status(400).json({
        success: false,
        message: "transactionId is required",
      });
    }

    // Replace this with however your auth middleware exposes the user.
    const adminUserId = req.user.id;

    const result = await createPayment(
      adminUserId,
      {
        transactionType: TransactionType.REVERSAL,

        transactionIdToReverse: transactionId,

        // Required by your current CreatePaymentRequest.
        // executeReversalTransaction() ignores them.
        amount: 0n,
        toAccountId: "",

        idempotencyKey: randomUUID(),

        lockingStrategy:
          LockingStrategy.PESSIMISTIC,
      },
      {},
    );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}