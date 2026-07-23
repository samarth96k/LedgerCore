import { prisma } from "../../PrismaClient/prismaclient.js";
import bcrypt from "bcrypt";
import type { AddUserResult } from "./auth.types.js";
export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: {
      email,
    },
    include: {
      accounts: {
        select: {
          id: true,
          status: true,
          type: true,
        },
      },
    },
  });
}

export async function findUserById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}

export async function addNewUser(
  email: string,
  passwordHash: string,
  name: string,
  accountId: string
): Promise<AddUserResult> {
  return await prisma.$transaction(async (tx) => {
    // Check account
    const account = await tx.account.findUnique({
      where: {
        id: accountId,
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!account) {
      return {
        success: false,
        message:
          "Account does not exist. Please check your Account ID or contact customer support.",
      };
    }

    if (account.userId) {
      return {
        success: false,
        message: "This account is already linked to another user.",
      };
    }

    // Create User
    const user = await tx.user.create({
      data: {
        email,
        passwordHash,
        name,
      },
    });

    // Link Account
    await tx.account.update({
      where: {
        id: accountId,
      },
      data: {
        userId: user.id,
      },
    });

    return {
      success: true,
      user,
    };
  });
}
