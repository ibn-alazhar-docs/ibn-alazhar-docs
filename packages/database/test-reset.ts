/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  await prisma.user.updateMany({ data: { failedLoginAttempts: 0, lockedAt: null } });
  console.log("Reset lockouts");
}
main().finally(() => prisma.$disconnect());
