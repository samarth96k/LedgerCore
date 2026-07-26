import type { Request, Response } from "express";

import {
  getTransactionById,
  getTransactionsByUserId,
  getTransactionsByStatus,
  getRecentTransactions,
  getTransactionEvents,
} from "./transaction.database.js";
import { serializeBigInt } from "../../common/config/serialiseBigInt.js";
import { TransactionStatus } from "@prisma/client";

import { logger } from "../../common/config/logger.js";

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