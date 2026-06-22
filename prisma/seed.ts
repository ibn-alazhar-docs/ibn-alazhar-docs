/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const guestUser = await prisma.user.upsert({
    where: { email: "guest@ibnalazhar.local" },
    update: {},
    create: {
      email: "guest@ibnalazhar.local",
      name: "ضيف",
      role: "STUDENT",
      locale: "ar",
    },
  });

  console.log(`Guest user created: ${guestUser.id}`);

  const userUser = await prisma.user.upsert({
    where: { email: "user@ibnalazhar.local" },
    update: {},
    create: {
      email: "user@ibnalazhar.local",
      name: "مستخدم",
      role: "STUDENT",
      locale: "ar",
      passwordHash: process.env.USER_PASSWORD
        ? bcrypt.hashSync(process.env.USER_PASSWORD, 12)
        : "$2b$12$7C6H1e/jllfmsem3c6i1weD/yTIr0LUJ.nKoHRtp.aB4mVr6iSV3q",
    },
  });

  console.log(`User created: ${userUser.id}`);

  const adminUser = await prisma.user.upsert({
    where: { email: process.env.ADMIN_EMAIL ?? "admin@ibnalazhar.app" },
    update: {},
    create: {
      email: process.env.ADMIN_EMAIL ?? "admin@ibnalazhar.app",
      name: "مدير النظام",
      role: "ADMIN",
      locale: "ar",
      passwordHash: process.env.ADMIN_PASSWORD
        ? bcrypt.hashSync(process.env.ADMIN_PASSWORD, 12)
        : bcrypt.hashSync("admin123", 12),
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
