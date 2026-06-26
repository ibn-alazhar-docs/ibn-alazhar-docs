import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { auditLog, AUDIT_ACTIONS } from "./audit";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

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
  secret:
    process.env.AUTH_SECRET ||
    (process.env.NODE_ENV === "production"
      ? (() => {
          throw new Error("AUTH_SECRET environment variable is required in production");
        })()
      : "dev-only-secret-do-not-use-in-production"),
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  jwt: {
    maxAge: 24 * 60 * 60, // 24 hours
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
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: "openid email profile https://www.googleapis.com/auth/drive.file",
        },
      },
    }),
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email as string;
        const password = credentials.password as string;

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

        if (!user || user.deletedAt || !user.passwordHash) return null;

        // Check lockout
        if (user.lockedAt) {
          const lockoutEnd = user.lockedAt.getTime() + LOCKOUT_DURATION_MS;
          if (Date.now() < lockoutEnd) {
            await auditLog({
              userId: user.id,
              action: AUDIT_ACTIONS.LOGIN_LOCKED,
              entity: "user",
              entityId: user.id,
              metadata: { email, remainingMs: lockoutEnd - Date.now() },
            });
            return null;
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
          const updateData: { failedLoginAttempts: number; lockedAt?: Date } = {
            failedLoginAttempts: newAttempts,
          };
          if (newAttempts >= MAX_FAILED_ATTEMPTS) {
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
            metadata: { email, attempts: newAttempts, locked: newAttempts >= MAX_FAILED_ATTEMPTS },
          });
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
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = user.role || "STUDENT";
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
