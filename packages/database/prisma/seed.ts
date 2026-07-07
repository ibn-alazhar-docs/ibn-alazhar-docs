/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

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
