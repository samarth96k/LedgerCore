import { prisma } from "../../PrismaClient/prismaclient.js";
import bcrypt from "bcrypt";

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: {
      email,
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
) {
  const newUser = await prisma.user.create({
    data: {
      email: email,
      passwordHash: passwordHash,
      name: name,
    },
  });
  return newUser;
  console.log(newUser);
}