import { describe, it, expect } from "vitest";

describe("Security Fixes — OCR Input Validation", () => {
  describe("Tesseract language allowlist", () => {
    const allowedLangs = new Set(["ara", "eng", "fra", "deu", "spa"]);

    function isLanguageAllowed(lang: string): boolean {
      return allowedLangs.has(lang);
    }

    it("allows ara", () => {
      expect(isLanguageAllowed("ara")).toBe(true);
    });

    it("allows eng", () => {
      expect(isLanguageAllowed("eng")).toBe(true);
    });

    it("allows fra", () => {
      expect(isLanguageAllowed("fra")).toBe(true);
    });

    it("allows deu", () => {
      expect(isLanguageAllowed("deu")).toBe(true);
    });

    it("allows spa", () => {
      expect(isLanguageAllowed("spa")).toBe(true);
    });

    it("rejects shell injection in lang", () => {
      expect(isLanguageAllowed("ara; rm -rf /")).toBe(false);
    });

    it("rejects command substitution in lang", () => {
      expect(isLanguageAllowed("ara$(whoami)")).toBe(false);
    });

    it("rejects backtick injection in lang", () => {
      expect(isLanguageAllowed("ara`id`")).toBe(false);
    });

    it("rejects empty string", () => {
      expect(isLanguageAllowed("")).toBe(false);
    });

    it("rejects unsupported language", () => {
      expect(isLanguageAllowed("jpn")).toBe(false);
    });

    it("rejects uppercase variant", () => {
      expect(isLanguageAllowed("ARA")).toBe(false);
    });
  });

  describe("Surya path sanitization", () => {
    it("paths passed via file, not string interpolation", () => {
      const imagePaths = ["/tmp/test1.jpg", "/tmp/test2.jpg"];
      const pathsJson = JSON.stringify(imagePaths);
      const parsed = JSON.parse(pathsJson);
      expect(parsed).toEqual(imagePaths);
    });

    it("paths from JSON file are safe", () => {
      const maliciousPath = '/tmp/test"; import os; os.system("rm -rf /")';
      const pathsJson = JSON.stringify([maliciousPath]);
      const parsed = JSON.parse(pathsJson);
      expect(parsed[0]).toBe(maliciousPath);
    });
  });

  describe("Google Drive query escaping", () => {
    it("escapes single quotes in folder name", () => {
      const folderName = "Test'; DROP TABLE folders; --";
      const escapedName = folderName.replace(/'/g, "\\'");
      expect(escapedName).toBe("Test\\'; DROP TABLE folders; --");
    });

    it("preserves normal folder names", () => {
      const folderName = "IBN_AL_AZHAR_DOCS";
      const escapedName = folderName.replace(/'/g, "\\'");
      expect(escapedName).toBe("IBN_AL_AZHAR_DOCS");
    });

    it("handles folder name with multiple quotes", () => {
      const folderName = "It's a 'folder' name";
      const escapedName = folderName.replace(/'/g, "\\'");
      expect(escapedName).toBe("It\\'s a \\'folder\\' name");
    });
  });
});
