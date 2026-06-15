/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";

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
      passwordHash: "$2b$12$7C6H1e/jllfmsem3c6i1weD/yTIr0LUJ.nKoHRtp.aB4mVr6iSV3q",
    },
  });

  console.log(`User created: ${userUser.id}`);

  const adminUser = await prisma.user.upsert({
    where: { email: process.env.ADMIN_EMAIL ?? "admin@ibnalazhar.local" },
    update: {},
    create: {
      email: process.env.ADMIN_EMAIL ?? "admin@ibnalazhar.local",
      name: "مدير النظام",
      role: "ADMIN",
      locale: "ar",
      passwordHash: "$2b$12$bGJjAXPTHoTztOybDAV1f.WTgeYnOWCif5IgMz7iO.rWoiFUiubCK",
    },
  });

  console.log(`Admin user created: ${adminUser.id}`);
  console.log("Seeding complete.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
