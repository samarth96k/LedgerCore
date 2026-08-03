import bcrypt from "bcrypt";
import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;

const accountIds = [
  "a412c563-ce39-411b-b2f5-f77e7edcf138",
  "1e528295-ae78-4f56-9464-385567c5490e",
  "77d3cf69-bd54-4082-9586-537f0df6214b",
  "2301e07f-feeb-4d5c-a646-5ca122b100c5",
  "65058ec3-0ac0-41e5-82a3-c9328ea47cbe",
  "40321a9c-b558-42b6-9daa-02ba1a7582bb",
  "744d33fa-48b8-46d5-a72f-4d8b032403c2",
  "a7bb74c3-a4c0-4f22-8231-fd68fda06e61",
  "a82eef0e-2750-4396-90be-7b766d63e866",
  "4f5e520b-794d-4c21-90e1-7b5aca2bd5ea",
  "17862f54-4844-4f2e-950d-02ba1bab8d45",
  "8f553796-3a08-4fc7-a8e2-8f653f3221db",
  "712f474e-5049-4593-9b96-f9afe1c4f51b",
  "ad07f1a2-c0ba-42b7-a91d-508fcfc69222",
  "40516354-054e-41c1-a36e-0df93e8eb353",
  "335aa66c-2de2-4b16-a885-679ef22ad38a",
  "abd21201-42a5-421c-b75e-8ea7a223bdf9",
  "85403ff5-db37-4d57-8e71-7e79c28445fb",
  "14d06be6-8ea8-4f49-b6a4-a436e4d8b62f",
  "139c9fa0-bee3-4e23-a480-eb3cabf8f6b2",
  "ae847306-dc82-44cf-97fe-aa26ac552b66",
  "4b85db5a-3083-46d0-bd5e-b75e1c8e9889",
  "79edbf7d-dc8a-4e96-a915-0f533f2dd510",
  "9a4951e8-6d9e-47e7-a4f5-4bf9782faa62",
  "9a25308a-be65-471b-9a74-85d9e9f9a341",
];

const firstNames = [
  "Aditya",
  "Jinansh",
  "Pratyaksh",
  "Ishaan",
  "Sneh",
  "Yadav",
  "Sharma",
  "Aakash",
  "Priyavrat",
  "Ayush",
  "Pranav",
  "Samarth",
  "Priyanshu",
  "Tushar",
  "Anurag",
  "John",
  "Jane",
  "Yash",
  "Abhineeti",
  "Navya",
  "Yosha",
  "Jenny",
  "Jia",
  "Vanshika",
  "Aarushi",
];

const surnames = [
  "Sharma",
  "Verma",
  "Gupta",
  "Agarwal",
  "Singh",
  "Yadav",
  "Patel",
  "Jain",
  "Khanna",
  "Kapoor",
  "Malhotra",
  "Bansal",
  "Goel",
  "Saxena",
  "Arora",
];

function generateEmail(first: string, last: string, index: number) {
  const f = first.toLowerCase();
  const l = last.toLowerCase();

  switch (index % 3) {
    case 0:
      return `${f}.${l}@gmail.com`;

    case 1:
      return `${f}${l}@gmail.com`;

    default:
      return `${f}@gmail.com`;
  }
}

async function main() {
  console.log("Creating User Wallet Users...\n");

  const passwordHash = await bcrypt.hash(
    "root@QWERTY1",
    SALT_ROUNDS,
  );

  for (let i = 0; i < accountIds.length; i++) {
const first = firstNames[i]!;
const last = surnames[i % surnames.length]!;

    const email = generateEmail(first, last, i);

    const user = await prisma.user.create({
      data: {
        name: `${first} ${last}`,
        email,
        passwordHash,
        role: UserRole.USER,
      },
    });

    await prisma.account.update({
      where: {
        id: accountIds[i]!,
      },
      data: {
        userId: user.id,
      },
    });

    console.log(
      `${i + 1}. ${first} ${last}`
    );

    console.log(
      `   ${email}`
    );

    console.log(
      `   ${accountIds[i]}\n`
    );
  }

  console.log("Completed Successfully.");

  await prisma.$disconnect();
}

main().catch(console.error);