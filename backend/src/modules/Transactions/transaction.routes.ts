import express from "express";
import {
  getTransactionByIdController,
  getTransactionsByUserIdController,
  getTransactionsByStatusController,
  getRecentTransactionsController,
  getTransactionEventsController,
} from "./transaction.controller.js";
//FOR POST TRANSACTION STUB
import { prisma } from "../../PrismaClient/prismaclient.js";
import { TransactionStatus } from "@prisma/client";
import { requireAdmin } from "../../common/middleware/auth.middleware.js";
import { serializeBigInt } from "../../common/config/serialiseBigInt.js";
//END FOR POST TRANSACTION STUB

export const transactionRouter = express.Router();

transactionRouter.get("/recent",requireAdmin,getRecentTransactionsController,); //TESTED
transactionRouter.get("/status/:status",requireAdmin,getTransactionsByStatusController,); //TESTED
transactionRouter.get("/user/:userId",requireAdmin,getTransactionsByUserIdController,);   //TESTED
transactionRouter.get("/:transactionId/events",requireAdmin,getTransactionEventsController,); //TESTED 
transactionRouter.get("/:transactionId",requireAdmin,getTransactionByIdController,); //TESTED

//REMOVE THE ROUTEE AFTER PAYMENT MODULE IS IMPLEMENTED AS IT IS JUST A STUB FOR IMPLEMENTATION!!!!!!
//TESTED
transactionRouter.post("/postTransactionStub",requireAdmin ,async (req, res) => {
  try {
    const {
      type,
      initiatorUserId,
      amount,
      currency = "INR",
      idempotencyKey,
      lockingStrategy,
    } = req.body;

    const transaction = await prisma.transaction.create({
      data: {
        type,
        initiatorUserId,
        amount: BigInt(amount),
        currency,
        idempotencyKey,
        lockingStrategy,
        status: TransactionStatus.PENDING,
      },
    });

return res.status(201).json({
  success: true,
  transaction: serializeBigInt(transaction),
});;
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Internal Server Error",
    });
  }
});

/*
  TEMPORARY DEVELOPMENT ROUTE
  REMOVE AFTER PAYMENT MODULE IS IMPLEMENTED
  TESTED
*/
transactionRouter.post(
  "/:transactionId/events",
  async (req, res) => {
    try {
      const { transactionId } = req.params;
      const { event, metadata } = req.body;

      const transactionEvent =
        await prisma.transactionEvent.create({
          data: {
            transactionId,
            event,
            ...(metadata !== undefined && {
              metadata,
            }),
          },
        });

      return res.status(201).json({
        success: true,
        transactionEvent: serializeBigInt(
          transactionEvent,
        ),
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Internal Server Error",
      });
    }
  },
);
//END FOR REMOVE THE ROUTEE AFTER PAYMENT MODULE IS IMPLEMENTED AS IT IS JUST A STUB FOR IMPLEMENTATION!!!!!!
