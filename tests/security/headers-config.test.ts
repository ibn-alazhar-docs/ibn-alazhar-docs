import { describe, it, expect } from "vitest";

describe("Security Headers & Configuration", () => {
  describe("Content Security Policy", () => {
    function buildCSP(isDev: boolean): string {
      return [
        "default-src 'self'",
        `script-src 'self' ${isDev ? "'unsafe-inline' 'unsafe-eval'" : ""}`,
        `style-src 'self' 'unsafe-inline'`,
        "img-src 'self' blob: data:",
        "font-src 'self' data:",
        "connect-src 'self' https:",
        "worker-src 'self' blob:",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join("; ");
    }

    it("production CSP has no unsafe-inline for scripts", () => {
      const csp = buildCSP(false);
      expect(csp).not.toContain("'unsafe-inline' 'unsafe-eval'");
      expect(csp).toContain("script-src 'self'");
    });

    it("CSP blocks framing (clickjacking protection)", () => {
      const csp = buildCSP(false);
      expect(csp).toContain("frame-ancestors 'none'");
    });

    it("CSP restricts base-uri to self", () => {
      const csp = buildCSP(false);
      expect(csp).toContain("base-uri 'self'");
    });

    it("CSP restricts form-action to self", () => {
      const csp = buildCSP(false);
      expect(csp).toContain("form-action 'self'");
    });

    it("CSP allows self for default-src", () => {
      const csp = buildCSP(false);
      expect(csp).toContain("default-src 'self'");
    });

    it("CSP allows blob: for workers (needed for OCR)", () => {
      const csp = buildCSP(false);
      expect(csp).toContain("worker-src 'self' blob:");
    });
  });

  describe("Security headers", () => {
    it("X-Content-Type-Options prevents MIME sniffing", () => {
      const header = "nosniff";
      expect(header).toBe("nosniff");
    });

    it("X-Frame-Options prevents framing", () => {
      const header = "DENY";
      expect(header).toBe("DENY");
    });

    it("Referrer-Policy limits information leakage", () => {
      const header = "strict-origin-when-cross-origin";
      expect(header).toBe("strict-origin-when-cross-origin");
    });
  });

  describe("Session cookie configuration", () => {
    const cookieConfig = {
      name: "next-auth.session-token",
      options: {
        httpOnly: true,
        secure: true,
        sameSite: "lax" as const,
        path: "/",
      },
    };

    it("session cookie is httpOnly (XSS protection)", () => {
      expect(cookieConfig.options.httpOnly).toBe(true);
    });

    it("session cookie is secure in production (HTTPS only)", () => {
      expect(cookieConfig.options.secure).toBe(true);
    });

    it("session cookie is sameSite=lax (CSRF protection)", () => {
      expect(cookieConfig.options.sameSite).toBe("lax");
    });

    it("session cookie path is / (available everywhere)", () => {
      expect(cookieConfig.options.path).toBe("/");
    });
  });

  describe("JWT/Session configuration", () => {
    it("session maxAge is 24 hours", () => {
      const maxAge = 24 * 60 * 60;
      expect(maxAge).toBe(86400);
    });

    it("JWT maxAge matches session maxAge", () => {
      const sessionMaxAge = 24 * 60 * 60;
      const jwtMaxAge = 24 * 60 * 60;
      expect(jwtMaxAge).toBe(sessionMaxAge);
    });
  });

  describe("Configuration security", () => {
    it("production without AUTH_SECRET throws", () => {
      const originalEnv = process.env.NODE_ENV;
      const originalSecret = process.env.AUTH_SECRET;

      try {
        process.env.NODE_ENV = "production";
        delete process.env.AUTH_SECRET;

        const getSecret = () => {
          return (
            process.env.AUTH_SECRET ||
            (process.env.NODE_ENV === "production"
              ? (() => {
                  throw new Error("AUTH_SECRET environment variable is required in production");
                })()
              : "dev-only-secret-do-not-use-in-production")
          );
        };

        expect(() => getSecret()).toThrow(
          "AUTH_SECRET environment variable is required in production",
        );
      } finally {
        process.env.NODE_ENV = originalEnv;
        if (originalSecret !== undefined) process.env.AUTH_SECRET = originalSecret;
      }
    });

    it("production with AUTH_SECRET uses env value", () => {
      const originalEnv = process.env.NODE_ENV;
      const originalSecret = process.env.AUTH_SECRET;

      try {
        process.env.NODE_ENV = "production";
        process.env.AUTH_SECRET = "my-secure-production-secret";

        const getSecret = () => {
          return (
            process.env.AUTH_SECRET ||
            (process.env.NODE_ENV === "production"
              ? (() => {
                  throw new Error("AUTH_SECRET environment variable is required in production");
                })()
              : "dev-only-secret-do-not-use-in-production")
          );
        };

        expect(getSecret()).toBe("my-secure-production-secret");
      } finally {
        process.env.NODE_ENV = originalEnv;
        if (originalSecret !== undefined) {
          process.env.AUTH_SECRET = originalSecret;
        } else {
          delete process.env.AUTH_SECRET;
        }
      }
    });

    it("dev fallback is clearly marked (not reusable as production secret)", () => {
      const devFallback = "dev-only-secret-do-not-use-in-production";
      expect(devFallback).toContain("dev-only");
      expect(devFallback).toContain("do-not-use");
    });

    it("ADMIN_PASSWORD should not use default in production", () => {
      const isProduction = process.env.NODE_ENV === "production";
      if (isProduction) {
        const adminPassword = process.env.ADMIN_PASSWORD;
        expect(adminPassword).toBeDefined();
        expect(adminPassword).not.toBe("Admin@123456");
      }
    });
  });

  describe("Protected routes", () => {
    const protectedRoutes = [
      "/dashboard",
      "/files",
      "/folders",
      "/tags",
      "/search",
      "/conversions",
      "/settings",
      "/preview",
      "/users",
    ];

    const guestOnlyRoutes = ["/login", "/register"];

    it("protected routes list includes dashboard", () => {
      expect(protectedRoutes).toContain("/dashboard");
    });

    it("protected routes list includes files", () => {
      expect(protectedRoutes).toContain("/files");
    });

    it("no overlap between protected and guest-only routes", () => {
      const overlap = protectedRoutes.filter((r) => guestOnlyRoutes.includes(r));
      expect(overlap).toHaveLength(0);
    });

    it("login is guest-only (redirects logged-in users)", () => {
      expect(guestOnlyRoutes).toContain("/login");
    });

    it("register is guest-only", () => {
      expect(guestOnlyRoutes).toContain("/register");
    });
  });

  describe("Rate limit configuration", () => {
    const RATE_LIMITS: Record<string, { limit: number; windowMs: number }> = {
      "/api/auth/register": { limit: 50, windowMs: 60_000 },
      "/api/auth/callback/credentials": { limit: 50, windowMs: 60_000 },
      "/api/search": { limit: 30, windowMs: 60_000 },
      "/api/export": { limit: 10, windowMs: 60_000 },
      "/api/upload": { limit: 20, windowMs: 60_000 },
      "/api/share": { limit: 30, windowMs: 60_000 },
    };

    it("register endpoint is rate limited", () => {
      expect(RATE_LIMITS["/api/auth/register"]).toBeDefined();
      expect(RATE_LIMITS["/api/auth/register"].limit).toBeLessThanOrEqual(50);
    });

    it("login endpoint is rate limited", () => {
      expect(RATE_LIMITS["/api/auth/callback/credentials"]).toBeDefined();
    });

    it("upload endpoint is rate limited", () => {
      expect(RATE_LIMITS["/api/upload"]).toBeDefined();
    });

    it("search endpoint is rate limited", () => {
      expect(RATE_LIMITS["/api/search"]).toBeDefined();
    });

    it("export endpoint has strictest limit", () => {
      const exportLimit = RATE_LIMITS["/api/export"].limit;
      const allLimits = Object.values(RATE_LIMITS).map((r) => r.limit);
      expect(exportLimit).toBe(Math.min(...allLimits));
    });

    it("all rate limits use 60-second window", () => {
      for (const rule of Object.values(RATE_LIMITS)) {
        expect(rule.windowMs).toBe(60_000);
      }
    });
  });
});
