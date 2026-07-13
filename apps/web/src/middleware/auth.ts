import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/transport/db";
import { auditLog, AUDIT_ACTIONS } from "./audit";
import { ROLE } from "@/domain/auth";
import { LIMITS } from "@/shared/constants";
import { checkIpRateLimit, getClientIp } from "@/clients/redis";
import { CredentialsSignin } from "next-auth";
import { logger } from "@/shared/logger";

class AccountLockedError extends CredentialsSignin {
  override code = "AccountLocked";
}

class IpRateLimitError extends CredentialsSignin {
  override code = "IpRateLimit";
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string | null;
      email: string;
      image: string | null;
      role: string;
    };
  }

  interface User {
    role: string;
  }

  interface JWT {
    id: string;
    role: string;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  secret:
    process.env.AUTH_SECRET ||
    (process.env.NODE_ENV === "development"
      ? "dev-only-secret-do-not-use-in-production"
      : (() => {
          throw new Error(
            "AUTH_SECRET environment variable is required for any non-development environment",
          );
        })()),
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: LIMITS.SESSION_MAX_AGE,
  },
  jwt: {
    maxAge: LIMITS.SESSION_MAX_AGE,
  },
  cookies: {
    sessionToken: {
      name: "next-auth.session-token",
      options: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      },
    },
  },
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            // SECURITY (H1): must remain false. When true, a Google account whose
            // email matches an existing (unverified) credentials account is
            // auto-linked, enabling account takeover. With false, the adapter only
            // links when the existing account's email is verified.
            allowDangerousEmailAccountLinking: false,
            authorization: {
              params: {
                prompt: "consent",
                access_type: "offline",
                response_type: "code",
                scope: "openid email profile https://www.googleapis.com/auth/drive.file",
              },
            },
          }),
        ]
      : []),
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email as string;
        const password = credentials.password as string;

        // Enforce per-IP rate limit to prevent brute force
        if (req instanceof Request) {
          const ip = getClientIp(req);
          logger.info({ email, ip }, "[AUTH] Login attempt");
          const rateLimitResult = await checkIpRateLimit("auth:login", ip, 5, 60_000);
          if (!rateLimitResult.allowed) {
            logger.warn({ ip }, "[AUTH] IP Rate limit exceeded");
            await auditLog({
              userId: "system",
              action: AUDIT_ACTIONS.LOGIN_FAILED,
              entity: "ip",
              entityId: ip,
              metadata: { email, reason: "ip_rate_limit_exceeded" },
            });
            throw new IpRateLimitError();
          }
        }

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            image: true,
            passwordHash: true,
            deletedAt: true,
            failedLoginAttempts: true,
            lockedAt: true,
          },
        });

        if (!user) {
          logger.info({ email }, "[AUTH] User not found");
          return null;
        }
        if (user.deletedAt) {
          logger.info({ email }, "[AUTH] User deleted");
          return null;
        }
        if (!user.passwordHash) {
          logger.info({ email }, "[AUTH] User has no password hash");
          return null;
        }

        // Check lockout
        if (user.lockedAt) {
          const lockoutEnd = user.lockedAt.getTime() + LIMITS.LOCKOUT_DURATION_MS;
          if (Date.now() < lockoutEnd) {
            logger.warn({ email }, "[AUTH] Account locked");
            await auditLog({
              userId: user.id,
              action: AUDIT_ACTIONS.LOGIN_LOCKED,
              entity: "user",
              entityId: user.id,
              metadata: { email, remainingMs: lockoutEnd - Date.now() },
            });
            throw new AccountLockedError();
          }
          // Lockout expired — reset
          await prisma.user.update({
            where: { id: user.id },
            data: { failedLoginAttempts: 0, lockedAt: null },
          });
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          const newAttempts = user.failedLoginAttempts + 1;
          logger.info({ email, attempts: newAttempts }, "[AUTH] Invalid password");
          const updateData: { failedLoginAttempts: number; lockedAt?: Date } = {
            failedLoginAttempts: newAttempts,
          };
          if (newAttempts >= LIMITS.MAX_FAILED_LOGIN_ATTEMPTS) {
            logger.warn({ email }, "[AUTH] Account locked due to max attempts");
            updateData.lockedAt = new Date();
          }
          await prisma.user.update({
            where: { id: user.id },
            data: updateData,
          });

          await auditLog({
            userId: user.id,
            action: AUDIT_ACTIONS.LOGIN_FAILED,
            entity: "user",
            entityId: user.id,
            metadata: {
              email,
              attempts: newAttempts,
              locked: newAttempts >= LIMITS.MAX_FAILED_LOGIN_ATTEMPTS,
            },
          });

          if (newAttempts >= LIMITS.MAX_FAILED_LOGIN_ATTEMPTS) {
            throw new AccountLockedError();
          }
          return null;
        }

        // Successful login — reset attempts
        if (user.failedLoginAttempts > 0) {
          await prisma.user.update({
            where: { id: user.id },
            data: { failedLoginAttempts: 0, lockedAt: null },
          });
        }

        await auditLog({
          userId: user.id,
          action: AUDIT_ACTIONS.LOGIN_SUCCESS,
          entity: "user",
          entityId: user.id,
          metadata: { email, provider: "credentials" },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // SECURITY (H1): prevent OAuth account takeover.
      // A Google sign-in must only link to an existing credentials account
      // if that account's email has been verified. If the matching account
      // exists but `emailVerified` is null, refuse to link so an attacker who
      // controls a Google account with a victim's (unverified) email cannot
      // gain access to the victim's credentials account. This matches the
      // default NextAuth v5 linking semantics for
      // `allowDangerousEmailAccountLinking: false` and adds an explicit,
      // adapter-independent guard.
      if (account?.provider === "google" && user.email) {
        const email = user.email.toLowerCase();
        const existing = await prisma.user.findUnique({
          where: { email },
          select: { emailVerified: true },
        });
        if (existing && existing.emailVerified === null) {
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = user.role || ROLE.STUDENT;
      }

      if (trigger === "update") {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, name: true, email: true, image: true, deletedAt: true },
        });

        if (dbUser && !dbUser.deletedAt) {
          token.role = dbUser.role;
          token.name = dbUser.name;
          token.email = dbUser.email;
          token.picture = dbUser.image;
        }
      }

      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as string;
      return session;
    },
  },
});
