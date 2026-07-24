import express from "express";

import { Router } from "express";
import { authUser,requireAdmin } from "../../common/middleware/auth.middleware.js";
import {
  createAccountController,
  getMyAccountController,
  getAccountByIdController,
  freezeAccountController,
  unfreezeAccountController,
  closeAccountController,
  getAccountBalanceController,
} from "./account.controller.js";

export const router = Router();
// User routes
router.get("/me", authUser, getMyAccountController); //tested
router.get("/me/balance", authUser, getAccountBalanceController); //tested

// Admin routes
router.post("/createAccount", authUser, requireAdmin, createAccountController); //tested
router.get("/:accountId", authUser, requireAdmin, getAccountByIdController); //tested
router.patch("/:accountId/freeze", authUser, requireAdmin, freezeAccountController); //tested
router.patch("/:accountId/unfreeze", authUser, requireAdmin, unfreezeAccountController); //tested
router.patch("/:accountId/close", authUser, requireAdmin, closeAccountController); //tested

export default router;  