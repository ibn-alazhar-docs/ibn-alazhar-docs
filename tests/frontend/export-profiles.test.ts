import { describe, it, expect } from "vitest";
import {
  sanitizeTitle,
  contentDispositionHeader,
  getContentType,
  getProfileConfig,
  getProfileFormats,
  EXPORT_PROFILE_CONFIGS,
} from "@/lib/export/profiles";

describe("sanitizeTitle", () => {
  it("normal title preserved", () => {
    expect(sanitizeTitle("My Document")).toBe("My_Document");
  });

  it("special characters removed", () => {
    expect(sanitizeTitle('file\\name/with:*?"<>|chars')).toBe("filenamewithchars");
  });

  it("spaces converted to underscores", () => {
    expect(sanitizeTitle("hello world test")).toBe("hello_world_test");
  });

  it("long title truncated to 100 chars", () => {
    const longTitle = "a".repeat(150);
    const result = sanitizeTitle(longTitle);
    expect(result.length).toBe(100);
  });

  it("empty title returns untitled", () => {
    expect(sanitizeTitle("")).toBe("untitled");
  });

  it("title with only special chars returns untitled", () => {
    expect(sanitizeTitle('\\/:*?"<>|')).toBe("untitled");
  });

  it("Arabic title preserved", () => {
    expect(sanitizeTitle("تفسير ابن كثير")).toBe("تفسير_ابن_كثير");
  });

  it("mixed Arabic and English", () => {
    expect(sanitizeTitle("كتاب PDF Notes")).toBe("كتاب_PDF_Notes");
  });

  it("multiple spaces collapsed to single underscore", () => {
    expect(sanitizeTitle("hello   world")).toBe("hello_world");
  });

  it("title exactly 100 chars not truncated", () => {
    const title = "a".repeat(100);
    expect(sanitizeTitle(title)).toBe(title);
  });

  it("title 101 chars truncated", () => {
    const title = "a".repeat(101);
    expect(sanitizeTitle(title).length).toBe(100);
  });
});

describe("contentDispositionHeader", () => {
  it("ASCII filename produces simple attachment", () => {
    const result = contentDispositionHeader("report.md");
    expect(result).toContain('attachment; filename="report.md"');
    expect(result).toContain("filename*=UTF-8''report.md");
  });

  it("Arabic filename uses RFC 5987 encoding", () => {
    const result = contentDispositionHeader("تقرير.pdf");
    expect(result).toContain("attachment;");
    expect(result).toContain("filename*=UTF-8''");
    expect(result).toContain("%D8%AA%D9%82%D8%B1%D9%8A%D8%B1");
  });

  it("non-ASCII chars replaced with _ in ascii fallback", () => {
    const result = contentDispositionHeader("ملف.txt");
    expect(result).toMatch(/filename="[^"]*"/);
    const asciiMatch = result.match(/filename="([^"]*)"/);
    expect(asciiMatch?.[1]).not.toContain("م");
  });

  it("spaces in filename converted to _ in ASCII part", () => {
    const result = contentDispositionHeader("my file.txt");
    expect(result).toContain('filename="my_file.txt"');
  });

  it("special RFC 5987 chars encoded in UTF-8 part", () => {
    const result = contentDispositionHeader("file's (copy).txt");
    expect(result).toContain("%27");
    expect(result).toContain("%28");
    expect(result).toContain("%29");
  });

  it("empty filename falls back to download", () => {
    const result = contentDispositionHeader("");
    expect(result).toContain('filename="download"');
  });
});

describe("getContentType", () => {
  it("md returns text/markdown", () => {
    expect(getContentType("md")).toBe("text/markdown; charset=utf-8");
  });

  it("txt returns text/plain", () => {
    expect(getContentType("txt")).toBe("text/plain; charset=utf-8");
  });

  it("json returns application/json", () => {
    expect(getContentType("json")).toBe("application/json; charset=utf-8");
  });

  it("zip returns application/zip", () => {
    expect(getContentType("zip")).toBe("application/zip");
  });

  it("unknown format returns octet-stream", () => {
    expect(getContentType("unknown" as "md")).toBe("application/octet-stream");
  });
});

describe("getProfileConfig", () => {
  it("research profile has correct name", () => {
    expect(getProfileConfig("research").name).toBe("Research");
  });

  it("archive profile includes source", () => {
    expect(getProfileConfig("archive").includeSource).toBe(true);
  });

  it("plain profile has no metadata", () => {
    expect(getProfileConfig("plain").includeMetadata).toBe(false);
  });

  it("developer profile formats are json only", () => {
    expect(getProfileConfig("developer").formats).toEqual(["json"]);
  });

  it("all profiles have required fields", () => {
    for (const profile of ["research", "archive", "plain", "developer"] as const) {
      const config = getProfileConfig(profile);
      expect(config).toHaveProperty("name");
      expect(config).toHaveProperty("description");
      expect(config).toHaveProperty("formats");
      expect(config).toHaveProperty("includeMetadata");
      expect(config).toHaveProperty("includeSource");
      expect(config).toHaveProperty("includeTags");
      expect(config).toHaveProperty("includeFolderPath");
      expect(config).toHaveProperty("metadataLevel");
    }
  });
});

describe("getProfileFormats", () => {
  it("research returns md and json", () => {
    expect(getProfileFormats("research")).toEqual(["md", "json"]);
  });

  it("archive returns md, txt, json", () => {
    expect(getProfileFormats("archive")).toEqual(["md", "txt", "json"]);
  });

  it("plain returns txt only", () => {
    expect(getProfileFormats("plain")).toEqual(["txt"]);
  });

  it("developer returns json only", () => {
    expect(getProfileFormats("developer")).toEqual(["json"]);
  });
});

describe("EXPORT_PROFILE_CONFIGS", () => {
  it("has 4 profiles", () => {
    expect(Object.keys(EXPORT_PROFILE_CONFIGS)).toHaveLength(4);
  });

  it("all profiles have non-empty names", () => {
    for (const config of Object.values(EXPORT_PROFILE_CONFIGS)) {
      expect(config.name.length).toBeGreaterThan(0);
    }
  });

  it("all profiles have at least one format", () => {
    for (const config of Object.values(EXPORT_PROFILE_CONFIGS)) {
      expect(config.formats.length).toBeGreaterThan(0);
    }
  });
});
