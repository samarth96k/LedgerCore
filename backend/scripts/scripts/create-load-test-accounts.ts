import {
  PrismaClient,
  AccountType,
  SystemAccountType,
} from "@prisma/client";

const prisma = new PrismaClient();

function generateAadhaar(index: number): string {
  // 12-digit unique number
  return `9999${String(index).padStart(8, "0")}`;
}

async function createAccount(
  type: AccountType,
  aadhaar: string,
  systemType?: SystemAccountType,
) {
  const data = {
    type,
    aadhaarNumber: aadhaar,
    ...(systemType !== undefined && {
      systemType,
    }),
  };

  const account = await prisma.account.create({
    data,
  });

  await prisma.accountBalance.create({
    data: {
      accountId: account.id,
      cachedBalance: 0n,
    },
  });

  return account;
}

async function main() {
  console.log("Creating load testing accounts...\n");

  const systems = [
    SystemAccountType.TREASURY,
    SystemAccountType.UPI_CLEARING,
    SystemAccountType.BANK_CLEARING,
    SystemAccountType.ATM_CLEARING,
    SystemAccountType.ADMIN_INITIATED,
    SystemAccountType.REFUND_ACCOUNT,
    SystemAccountType.FEE_REVENUE,
    SystemAccountType.SUSPENSE,
    SystemAccountType.FOREIGN_SETTLEMENT,
    SystemAccountType.DEPOSIT,
    SystemAccountType.WITHDRAWAL,
  ];

  let aadhaarCounter = 1;

  console.log("========== SYSTEM ACCOUNTS ==========");

  for (const system of systems) {
    const account = await createAccount(
      AccountType.SYSTEM,
      generateAadhaar(aadhaarCounter++),
      system,
    );

    console.log(`${system} -> ${account.id}`);
  }

  console.log("\n========== USER ACCOUNTS ==========");

  for (let i = 1; i <= 25; i++) {
    const account = await createAccount(
      AccountType.USER_WALLET,
      generateAadhaar(aadhaarCounter++),
    );

    console.log(
      `USER_${String(i).padStart(2, "0")} -> ${account.id}`,
    );
  }

  console.log("\nDone.");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });