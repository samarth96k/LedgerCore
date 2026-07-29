import { SystemAccountType } from "@prisma/client";
export const SYSTEM_ACCOUNTS: Record<SystemAccountType, string> = {
  TREASURY: process.env.TREASURY_ACCOUNT_ID!,
  UPI_CLEARING: process.env.UPI_CLEARING_ACCOUNT_ID!,
  BANK_CLEARING: process.env.BANK_CLEARING_ACCOUNT_ID!,
  ATM_CLEARING: process.env.ATM_CLEARING_ACCOUNT_ID!,
  ADMIN_INITIATED: process.env.ADMIN_INITIATED_ACCOUNT_ID!,
  REFUND_ACCOUNT: process.env.REFUND_ACCOUNT_ID!,
  FEE_REVENUE: process.env.FEE_REVENUE_ACCOUNT_ID!,
  SUSPENSE: process.env.SUSPENSE_ACCOUNT_ID!,
  FOREIGN_SETTLEMENT: process.env.FOREIGN_SETTLEMENT_ACCOUNT_ID!,
  DEPOSIT:process.env.DEPOSIT!,
  WITHDRAWAL:process.env.WITHDRAWAL!
};

//create accounts and connet them to user manually