import type { Request, Response } from "express";

import {
  getLedgerEntriesByTransactionId,
  getLedgerEntriesByAccountId,
  getLatestLedgerEntry,
} from "./ledger.database.js";
import { serializeBigInt } from "../../common/config/serialiseBigInt.js";
import { logger } from "../../common/config/logger.js";

export const getLedgerEntriesByTransactionIdController = async (
  req: Request<{ transactionId: string }>,
  res: Response,
): Promise<Response> => {
  try {
    const { transactionId } = req.params;

    const entries =
      await getLedgerEntriesByTransactionId(
        transactionId,
      );

    return res.status(200).json({
      success: true,
      entries:serializeBigInt(entries),
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

export const getLedgerEntriesByAccountIdController = async (
  req: Request<{ accountId: string }>,
  res: Response,
): Promise<Response> => {
  try {
    const { accountId } = req.params;

    const entries =
      await getLedgerEntriesByAccountId(
        accountId,
      );

    return res.status(200).json({
      success: true,
      entries:serializeBigInt(entries),
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

export const getLatestLedgerEntryController = async (
  req: Request<{ accountId: string }>,
  res: Response,
): Promise<Response> => {
  try {
    const { accountId } = req.params;

    const entry =
      await getLatestLedgerEntry(accountId);

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: "Ledger entry not found.",
      });
    }

    return res.status(200).json({
      success: true,
      entry:serializeBigInt (entry),
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