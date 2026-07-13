import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
prisma.document
  .create({
    data: {
      id: "test",
      userId: "test",
      title: "test",
      fileName: "test",
      originalName: "test",
      mimeType: "test",
      fileSize: 12345,
      storageKey: "test",
    },
  })
  .catch(console.error);
