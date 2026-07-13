import { auth, signIn } from "./apps/web/src/middleware/auth";
import { prisma } from "./packages/database/src/client";
import { NextRequest } from "next/server";

async function run() {
  try {
    // NextAuth v5 server-side signin isn't easily testable via scripts without HTTP context, 
    // but we can test the `authorize` function directly!
    const { handlers } = await import("./apps/web/src/middleware/auth");
    console.log("Handlers exported.");
  } catch (err) {
    console.error(err);
  }
}
run();
