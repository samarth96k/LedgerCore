import { Router } from "express";
import {
  getLedgerEntriesByTransactionIdController,
  getLedgerEntriesByAccountIdController,
  getLatestLedgerEntryController,
} from "./ledger.controller.js";


export const ledgerRouter = Router();

ledgerRouter.get(
  "/transaction/:transactionId",
  getLedgerEntriesByTransactionIdController,
);

ledgerRouter.get(
  "/account/:accountId",
  getLedgerEntriesByAccountIdController,
);

ledgerRouter.get(
  "/account/:accountId/latest",
  getLatestLedgerEntryController,
);

export default ledgerRouter;