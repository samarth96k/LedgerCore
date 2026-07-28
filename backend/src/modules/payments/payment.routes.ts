import express from "express";
import { createPaymentController } from "./payment.controller.js";

export const paymentsRouter = express.Router();


paymentsRouter.post("/",createPaymentController,);

