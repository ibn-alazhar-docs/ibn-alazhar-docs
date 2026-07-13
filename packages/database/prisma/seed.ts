/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const guestUser = await prisma.user.upsert({
    where: { email: "guest@ibnalazhar.local" },
    update: {
      failedLoginAttempts: 0,
      lockedAt: null,
    },
    create: {
      email: "guest@ibnalazhar.local",
      name: "ضيف",
      role: "STUDENT",
      locale: "ar",
    },
  });

  console.log(`Guest user created: ${guestUser.id}`);

  const userPasswordHash = bcrypt.hashSync(process.env.USER_PASSWORD || "UserPassword123!", 10);

  const userUser = await prisma.user.upsert({
    where: { email: "user@ibnalazhar.local" },
    update: {
      passwordHash: userPasswordHash,
      failedLoginAttempts: 0,
      lockedAt: null,
    },
    create: {
      email: "user@ibnalazhar.local",
      name: "مستخدم",
      role: "STUDENT",
      locale: "ar",
      passwordHash: userPasswordHash,
    },
  });

  console.log(`User created: ${userUser.id}`);

  const adminPasswordHash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || "AdminPassword123!", 10);

  const adminUser = await prisma.user.upsert({
    where: { email: process.env.ADMIN_EMAIL ?? "admin@ibnalazhar.app" },
    update: {
      passwordHash: adminPasswordHash,
      failedLoginAttempts: 0,
      lockedAt: null,
    },
    create: {
      email: process.env.ADMIN_EMAIL ?? "admin@ibnalazhar.app",
      name: "مدير النظام",
      role: "ADMIN",
      locale: "ar",
      passwordHash: adminPasswordHash,
    },
  });

  console.log(`Admin user created: ${adminUser.id}`);

  // Test admin password is env-driven (no hardcoded weak default). In
  // production this MUST be overridden; falling back to a random value avoids
  // ever persisting a known/guessable credential.
  const testAdminPassword =
    process.env.TEST_ADMIN_PASSWORD || randomBytes(18).toString("base64url");
  const testPasswordHash = bcrypt.hashSync(testAdminPassword, 10);
  if (!process.env.TEST_ADMIN_PASSWORD) {
    console.warn(
      "[seed] TEST_ADMIN_PASSWORD not set — generated a random password for ibnalazhardocs@gmail.com. Set TEST_ADMIN_PASSWORD in production.",
    );
  }

  const testUser = await prisma.user.upsert({
    where: { email: "ibnalazhardocs@gmail.com" },
    update: {
      passwordHash: testPasswordHash,
      failedLoginAttempts: 0,
      lockedAt: null,
    },
    create: {
      email: "ibnalazhardocs@gmail.com",
      name: "حساب الاختبار",
      role: "ADMIN",
      locale: "ar",
      passwordHash: testPasswordHash,
    },
  });

  console.log(`Test user created: ${testUser.id}`);

  console.log("Seeding complete. Clean database without fake data.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
