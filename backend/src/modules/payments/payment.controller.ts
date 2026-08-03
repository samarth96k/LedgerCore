import type { Request, Response, NextFunction } from "express";

import { createPayment } from "./payment.service.js";

import type { CreatePaymentRequest, PaymentOptions } from "./payment.types.js";

export async function createPaymentController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const authenticatedUserId = req.user.id;
    const { platformFee, tax, ...body } = req.body;

    const paymentRequest: CreatePaymentRequest = {
      ...req.body,
      amount: BigInt(req.body.amount),
    };

    const options: PaymentOptions = {
      ...(platformFee !== undefined && {
        platformFee: BigInt(platformFee),
      }),

      ...(tax !== undefined && {
        tax: BigInt(tax),
      }),
    };

    const payment = await createPayment(
      authenticatedUserId,
      paymentRequest,
      options,
    );

    res.status(201).json(payment);
  } catch (error) {
    next(error);
  }
}
