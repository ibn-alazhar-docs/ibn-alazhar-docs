/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const logs = await prisma.auditLog.findMany({ take: 5, orderBy: { createdAt: "desc" } });
  console.log(logs);
}
main().finally(() => prisma.$disconnect());
