import { describe, it, expect } from "vitest";
import {
  type DocumentIR,
  type TextNode,
  documentIRSchema,
  isDocumentIR,
  parseDocumentIR,
  safeParseDocumentIR,
} from "./document-ir";

describe("DocumentIR Types", () => {
  describe("Type Validation", () => {
    it("should validate a minimal valid DocumentIR", () => {
      const minimalIR: DocumentIR = {
        version: "1.0",
        metadata: {
          ocrProvider: "gemini",
          pageCount: 1,
          language: "ar",
          confidence: 0.95,
          processedAt: "2024-01-15T10:30:00Z",
        },
        content: [],
      };

      const result = documentIRSchema.safeParse(minimalIR);
      expect(result.success).toBe(true);
    });

    it("should validate a complete DocumentIR with all node types", () => {
      const completeIR: DocumentIR = {
        version: "1.0",
        metadata: {
          ocrProvider: "gemini",
          pageCount: 1,
          language: "ar",
          confidence: 0.95,
          processedAt: "2024-01-15T10:30:00Z",
        },
        content: [
          {
            type: "heading",
            level: 1,
            content: [
              {
                type: "text",
                content: "عنوان الوثيقة",
                emphasis: { bold: true },
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              { type: "text", content: "هذه فقرة عادية مع " },
              {
                type: "text",
                content: "نص مهم",
                emphasis: { bold: true },
              },
              { type: "text", content: " في المنتصف." },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [{ type: "text", content: "العنصر الأول" }],
              },
              {
                content: [{ type: "text", content: "العنصر الثاني" }],
              },
            ],
          },
          {
            type: "code-block",
            language: "javascript",
            content: 'console.log("Hello World");',
          },
        ],
      };

      const result = documentIRSchema.safeParse(completeIR);
      expect(result.success).toBe(true);
    });

    it("should validate nested lists", () => {
      const nestedListIR: DocumentIR = {
        version: "1.0",
        metadata: {
          ocrProvider: "tesseract",
          pageCount: 1,
          language: "en",
          confidence: 0.88,
          processedAt: "2024-01-15T10:30:00Z",
        },
        content: [
          {
            type: "list",
            ordered: true,
            startNumber: 1,
            items: [
              {
                content: [{ type: "text", content: "First item" }],
                children: [
                  {
                    type: "list",
                    ordered: false,
                    items: [
                      {
                        content: [{ type: "text", content: "Nested item 1" }],
                      },
                      {
                        content: [{ type: "text", content: "Nested item 2" }],
                      },
                    ],
                  },
                ],
              },
              {
                content: [{ type: "text", content: "Second item" }],
              },
            ],
          },
        ],
      };

      const result = documentIRSchema.safeParse(nestedListIR);
      expect(result.success).toBe(true);
    });
  });

  describe("Invalid Documents", () => {
    it("should reject invalid version", () => {
      const invalidIR = {
        version: "2.0", // Invalid version
        metadata: {
          ocrProvider: "gemini",
          pageCount: 1,
          language: "ar",
          confidence: 0.95,
          processedAt: "2024-01-15T10:30:00Z",
        },
        content: [],
      };

      const result = documentIRSchema.safeParse(invalidIR);
      expect(result.success).toBe(false);
    });

    it("should reject invalid OCR provider", () => {
      const invalidIR = {
        version: "1.0",
        metadata: {
          ocrProvider: "invalid-provider", // Invalid provider
          pageCount: 1,
          language: "ar",
          confidence: 0.95,
          processedAt: "2024-01-15T10:30:00Z",
        },
        content: [],
      };

      const result = documentIRSchema.safeParse(invalidIR);
      expect(result.success).toBe(false);
    });

    it("should reject confidence out of range", () => {
      const invalidIR = {
        version: "1.0",
        metadata: {
          ocrProvider: "gemini",
          pageCount: 1,
          language: "ar",
          confidence: 1.5, // > 1.0
          processedAt: "2024-01-15T10:30:00Z",
        },
        content: [],
      };

      const result = documentIRSchema.safeParse(invalidIR);
      expect(result.success).toBe(false);
    });

    it("should reject invalid heading level", () => {
      const invalidIR = {
        version: "1.0",
        metadata: {
          ocrProvider: "gemini",
          pageCount: 1,
          language: "ar",
          confidence: 0.95,
          processedAt: "2024-01-15T10:30:00Z",
        },
        content: [
          {
            type: "heading",
            level: 7, // Invalid level (must be 1-6)
            content: [{ type: "text", content: "Invalid heading" }],
          },
        ],
      };

      const result = documentIRSchema.safeParse(invalidIR);
      expect(result.success).toBe(false);
    });

    it("should reject invalid font weight", () => {
      const invalidIR = {
        version: "1.0",
        metadata: {
          ocrProvider: "gemini",
          pageCount: 1,
          language: "ar",
          confidence: 0.95,
          processedAt: "2024-01-15T10:30:00Z",
        },
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                content: "Text",
                fontWeight: 1000, // > 900
              },
            ],
          },
        ],
      };

      const result = documentIRSchema.safeParse(invalidIR);
      expect(result.success).toBe(false);
    });
  });

  describe("Helper Functions", () => {
    const validIR: DocumentIR = {
      version: "1.0",
      metadata: {
        ocrProvider: "gemini",
        pageCount: 1,
        language: "ar",
        confidence: 0.95,
        processedAt: "2024-01-15T10:30:00Z",
      },
      content: [
        {
          type: "heading",
          level: 1,
          content: [{ type: "text", content: "Title" }],
        },
      ],
    };

    describe("isDocumentIR", () => {
      it("should return true for valid DocumentIR", () => {
        expect(isDocumentIR(validIR)).toBe(true);
      });

      it("should return false for invalid object", () => {
        expect(isDocumentIR({ invalid: "object" })).toBe(false);
      });

      it("should return false for null", () => {
        expect(isDocumentIR(null)).toBe(false);
      });
    });

    describe("parseDocumentIR", () => {
      it("should parse valid DocumentIR", () => {
        const result = parseDocumentIR(validIR);
        expect(result).toEqual(validIR);
      });

      it("should throw error for invalid object", () => {
        expect(() => parseDocumentIR({ invalid: "object" })).toThrow();
      });
    });

    describe("safeParseDocumentIR", () => {
      it("should return success for valid DocumentIR", () => {
        const result = safeParseDocumentIR(validIR);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(validIR);
        }
      });

      it("should return failure for invalid object", () => {
        const result = safeParseDocumentIR({ invalid: "object" });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBeDefined();
        }
      });
    });
  });

  describe("Text Emphasis", () => {
    it("should accept all emphasis types", () => {
      const textNode: TextNode = {
        type: "text",
        content: "Styled text",
        emphasis: {
          bold: true,
          italic: true,
          underline: true,
          strikethrough: true,
        },
      };

      const ir: DocumentIR = {
        version: "1.0",
        metadata: {
          ocrProvider: "gemini",
          pageCount: 1,
          language: "en",
          confidence: 0.9,
          processedAt: "2024-01-15T10:30:00Z",
        },
        content: [
          {
            type: "paragraph",
            content: [textNode],
          },
        ],
      };

      const result = documentIRSchema.safeParse(ir);
      expect(result.success).toBe(true);
    });

    it("should accept partial emphasis", () => {
      const textNode: TextNode = {
        type: "text",
        content: "Bold text",
        emphasis: {
          bold: true,
        },
      };

      const ir: DocumentIR = {
        version: "1.0",
        metadata: {
          ocrProvider: "gemini",
          pageCount: 1,
          language: "en",
          confidence: 0.9,
          processedAt: "2024-01-15T10:30:00Z",
        },
        content: [
          {
            type: "paragraph",
            content: [textNode],
          },
        ],
      };

      const result = documentIRSchema.safeParse(ir);
      expect(result.success).toBe(true);
    });

    it("should accept text without emphasis", () => {
      const textNode: TextNode = {
        type: "text",
        content: "Plain text",
      };

      const ir: DocumentIR = {
        version: "1.0",
        metadata: {
          ocrProvider: "gemini",
          pageCount: 1,
          language: "en",
          confidence: 0.9,
          processedAt: "2024-01-15T10:30:00Z",
        },
        content: [
          {
            type: "paragraph",
            content: [textNode],
          },
        ],
      };

      const result = documentIRSchema.safeParse(ir);
      expect(result.success).toBe(true);
    });
  });
});
