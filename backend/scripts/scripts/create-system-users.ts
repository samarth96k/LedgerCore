import bcrypt from "bcrypt";
import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;

const SYSTEMS = [
  {
    accountId: "28881d61-6b54-4c10-83be-321359fa440e",
    name: "Treasury",
    email: "admin.treasury@ledger.com",
  },
  {
    accountId: "df3ecb25-5351-4bb8-8dae-7d97454b9f54",
    name: "UPI Clearing",
    email: "admin.upi_clearing@ledger.com",
  },
  {
    accountId: "a6036d6a-2669-4b3b-aade-5e06ad794dbc",
    name: "Bank Clearing",
    email: "admin.bank_clearing@ledger.com",
  },
  {
    accountId: "61954922-aaf2-4888-94d5-3d79594ed454",
    name: "ATM Clearing",
    email: "admin.atm_clearing@ledger.com",
  },
  {
    accountId: "8e90858a-25da-407c-8f2f-50d7f4774baf",
    name: "Admin Initiated",
    email: "admin.admin_initiated@ledger.com",
  },
  {
    accountId: "a905dd29-0d94-46c1-bd8a-7cd41d0c2df0",
    name: "Refund Account",
    email: "admin.refund_account@ledger.com",
  },
  {
    accountId: "0759c6e0-41ea-4edd-90ef-a289071daa80",
    name: "Fee Revenue",
    email: "admin.fee_revenue@ledger.com",
  },
  {
    accountId: "070a3264-fb1e-4235-8658-0b8db95c1d74",
    name: "Suspense",
    email: "admin.suspense@ledger.com",
  },
  {
    accountId: "aea79a91-57ad-400f-ab81-ae2a68fc3fc5",
    name: "Foreign Settlement",
    email: "admin.foreign_settlement@ledger.com",
  },
  {
    accountId: "5928eb3b-32bd-4e45-84a2-35cd7c773739",
    name: "Deposit",
    email: "admin.deposit@ledger.com",
  },
  {
    accountId: "1b7843e2-9aa8-4580-a47e-ff5c30f194cf",
    name: "Withdrawal",
    email: "admin.withdrawal@ledger.com",
  },
];

async function main() {
  console.log("Creating System Users...\n");

  for (const system of SYSTEMS) {
    const password = `root@QWERTY1${system.name.replace(/\s/g, "")}`;

    const passwordHash = await bcrypt.hash(
      password,
      SALT_ROUNDS,
    );

    const user = await prisma.user.create({
      data: {
        name: system.name,
        email: system.email,
        passwordHash,
        role: UserRole.ADMIN,
      },
    });

    await prisma.account.update({
      where: {
        id: system.accountId,
      },
      data: {
        userId: user.id,
      },
    });

    console.log(
      `${system.name} -> ${user.email}`,
    );

    console.log(
      `Password: ${password}\n`,
    );
  }

  console.log("Done.");

  await prisma.$disconnect();
}

main().catch(console.error);