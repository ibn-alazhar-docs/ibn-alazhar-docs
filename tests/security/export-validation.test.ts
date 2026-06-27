import { describe, it, expect } from "vitest";
import { z } from "zod";

const exportSchema = z.object({
  format: z.enum(["md", "txt", "docx", "epub", "json", "pdf", "searchable-pdf"]),
  options: z
    .object({
      destination: z.enum(["local", "drive"]).optional(),
      profile: z.enum(["research", "archive", "plain", "developer"]).optional(),
    })
    .optional(),
});

describe("Security Fixes — Export Input Validation", () => {
  describe("exportSchema", () => {
    it("accepts valid minimal export", () => {
      const result = exportSchema.parse({ format: "md" });
      expect(result.format).toBe("md");
      expect(result.options).toBeUndefined();
    });

    it("accepts valid export with options", () => {
      const result = exportSchema.parse({
        format: "pdf",
        options: { destination: "drive", profile: "research" },
      });
      expect(result.format).toBe("pdf");
      expect(result.options?.destination).toBe("drive");
      expect(result.options?.profile).toBe("research");
    });

    it("rejects invalid format", () => {
      expect(() => exportSchema.parse({ format: "invalid" })).toThrow();
    });

    it("rejects invalid destination", () => {
      expect(() => exportSchema.parse({ format: "md", options: { destination: "s3" } })).toThrow();
    });

    it("rejects invalid profile", () => {
      expect(() => exportSchema.parse({ format: "md", options: { profile: "custom" } })).toThrow();
    });

    it("rejects arbitrary options (was open record before)", () => {
      expect(() =>
        exportSchema.parse({ format: "md", options: { arbitraryKey: "value" } }),
      ).toThrow();
    });

    it("rejects nested injection attempts", () => {
      expect(() =>
        exportSchema.parse({
          format: "md",
          options: { destination: "local" },
          __proto__: { polluted: true },
        }),
      ).toThrow();
    });

    it("accepts all valid formats", () => {
      const formats = ["md", "txt", "docx", "epub", "json", "pdf", "searchable-pdf"];
      for (const format of formats) {
        const result = exportSchema.parse({ format });
        expect(result.format).toBe(format);
      }
    });

    it("accepts all valid destinations", () => {
      const destinations = ["local", "drive"];
      for (const destination of destinations) {
        const result = exportSchema.parse({ format: "md", options: { destination } });
        expect(result.options?.destination).toBe(destination);
      }
    });

    it("accepts all valid profiles", () => {
      const profiles = ["research", "archive", "plain", "developer"];
      for (const profile of profiles) {
        const result = exportSchema.parse({ format: "md", options: { profile } });
        expect(result.options?.profile).toBe(profile);
      }
    });
  });
});
