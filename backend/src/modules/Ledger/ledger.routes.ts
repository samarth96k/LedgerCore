import { Router } from "express";
import {
  getLedgerEntriesByTransactionIdController,
  getLedgerEntriesByAccountIdController,
  getLatestLedgerEntryController,
} from "./ledger.controller.js";
import { prisma } from "../../PrismaClient/prismaclient.js";
import { postJournal } from "./ledger.service.js";
import { serializeBigInt } from "../../common/config/serialiseBigInt.js";

export const ledgerRouter = Router();

ledgerRouter.get(
  "/transaction/:transactionId",
  getLedgerEntriesByTransactionIdController,
); //tested

ledgerRouter.get("/account/:accountId", getLedgerEntriesByAccountIdController); //tested

ledgerRouter.get("/account/:accountId/latest", getLatestLedgerEntryController); //tested


//-----------------------------------------------------------------------------------------------------------------------------------------------------

//FOR TESTING PURPOSE ONLY******************     TESTED     ***********************************************************************/
ledgerRouter.post("/journal", async (req, res) => {
  try {
    const request = {
      ...req.body,
      entries: req.body.entries.map((entry: any) => ({
        ...entry,
        amount: BigInt(entry.amount),
      })),
    };

    const createdEntries = await prisma.$transaction(async (tx) => {
      return postJournal(tx, request);
    });

    return res.status(201).json({
      success: true,
      ledgerEntries: serializeBigInt(createdEntries),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal Server Error",
    });
  }
});

export default ledgerRouter;
