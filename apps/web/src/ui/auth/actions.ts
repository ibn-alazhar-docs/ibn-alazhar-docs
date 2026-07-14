"use server";

import { prisma } from "@/transport/db";
import { checkIpRateLimit, getClientIp } from "@/clients/redis";
import { headers } from "next/headers";
import { LIMITS } from "@/shared/constants";

export async function preCheckLogin(
  email: string,
): Promise<{ error: string | null; isLocked?: boolean }> {
  // Check IP rate limit
  const headersList = await headers();
  // Construct a dummy request to pass to getClientIp
  const req = new Request("http://localhost", { headers: headersList });
  const ip = getClientIp(req);

  const rateLimitResult = await checkIpRateLimit("auth:login", ip, 5, 60_000);
  if (!rateLimitResult.allowed) {
    return { error: "IpRateLimit", isLocked: true };
  }

  // Check account lockout
  const user = await prisma.user.findUnique({
    where: { email },
    select: { lockedAt: true },
  });

  if (user && user.lockedAt) {
    const lockoutEnd = user.lockedAt.getTime() + LIMITS.LOCKOUT_DURATION_MS;
    if (Date.now() < lockoutEnd) {
      return { error: "AccountLocked", isLocked: true };
    }
  }

  return { error: null };
}
