import { prisma } from "./client";
import { attachTokenEncryptionMiddleware } from "./token-encryption-middleware";

attachTokenEncryptionMiddleware(prisma);

export { prisma };
export { PrismaClient } from "@prisma/client";
export type { Prisma } from "@prisma/client";
export { encryptToken, decryptToken } from "./encryption";
