import { prisma } from "../../PrismaClient/prismaclient.js";

import { AccountType, AccountStatus, SystemAccountType } from "@prisma/client";

export async function createAccount(
  type: AccountType = AccountType.USER_WALLET,
  currency: string = "INR",
  status: AccountStatus = AccountStatus.ACTIVE,
  aadhaarNumber:string,
  systemType?: SystemAccountType,
) {
  if (type === AccountType.SYSTEM && !systemType) {
  throw new Error("System accounts must specify a system type.");
}

if (type === AccountType.USER_WALLET && systemType) {
  throw new Error("User wallet accounts cannot have a system type.");
}
  return await prisma.$transaction(async (tx) => {
    const account = await tx.account.create({
      data: {
        type,
        currency,
        status,
        systemType: systemType ?? null,
        aadhaarNumber
      },
    });

    await tx.accountBalance.create({
      data: {
        accountId: account.id,
        cachedBalance: BigInt(0),
        lastLedgerEntryId: null,
      },
    });

    return account;
  });
}

export async function getAccountById(accountId: string) {
  return prisma.account.findUnique({
    where: {
      id: accountId,
    },
    include: {
      balance: true,
    user: {
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    },
  }
  });
}

export async function getAccountByUserId(userId: string) {
  return prisma.account.findFirst({
    where: {
      userId,
    },
    include: {
      balance: true,
    },
  });
}

export async function updateAccountStatus(
  accountId: string,
  status: AccountStatus,
) {
  return prisma.account.update({
    where: {
      id: accountId,
    },
    data: {
      status,
    },
  });
}

export async function getBalanceByAccountId(accountId: string) {
  return prisma.accountBalance.findUnique({
    where: {
      accountId,
    },
  });
}

export async function updateCachedBalance(
  accountId: string,
  cachedBalance: bigint,
  lastLedgerEntryId: string|null,
) {
  return prisma.accountBalance.update({
    where: {
      accountId,
    },
    data: {
      cachedBalance,
      lastLedgerEntryId,
    },
  });
}