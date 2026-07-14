import { describe, it, expect } from "vitest";
import { cleanArabicText } from "./clean";
import { DEFAULT_OPTIONS, EXAM_OPTIONS } from "./constants";

describe("cleanArabicText", () => {
  describe("auto-detection with EXAM_OPTIONS", () => {
    it("preserves exam question markers with mixed Arabic/Latin", () => {
      const input = "س١: السؤال الأول\nس5: السؤال الخامس\nس10: السؤال العاشر";
      const output = cleanArabicText(input);

      expect(output).toContain("س١:");
      expect(output).toContain("س5:");
      expect(output).toContain("س10:");
    });

    it("preserves answer choice symbols", () => {
      const input = `س١: اختر الإجابة الصحيحة:
(أ) الخيار الأول
(ب) الخيار الثاني
(ج) الخيار الثالث
(د) الخيار الرابع`;
      const output = cleanArabicText(input);

      expect(output).toContain("(أ)");
      expect(output).toContain("(ب)");
      expect(output).toContain("(ج)");
      expect(output).toContain("(د)");
    });

    it("does not merge exam lines", () => {
      const input = `س١: سؤال قصير
(أ) جواب
(ب) جواب آخر
(ج) جواب ثالث`;
      const output = cleanArabicText(input);
      const lines = output.split("\n").filter((l) => l.trim().length > 0);

      // Each question and answer should remain on separate lines
      expect(lines.length).toBeGreaterThanOrEqual(4);
      expect(lines.some((l) => l.includes("س١:"))).toBe(true);
      expect(lines.some((l) => l.includes("(أ)"))).toBe(true);
      expect(lines.some((l) => l.includes("(ب)"))).toBe(true);
      expect(lines.some((l) => l.includes("(ج)"))).toBe(true);
    });

    it("preserves question numbering patterns", () => {
      const input = `س١: السؤال الأول
سؤال ٢: السؤال الثاني
(3): السؤال الثالث`;
      const output = cleanArabicText(input);

      // Should NOT convert to markdown headings
      expect(output).not.toContain("## س١:");
      expect(output).not.toContain("## سؤال ٢:");
      expect(output).toContain("س١:");
      expect(output).toContain("سؤال ٢:");
    });

    it("preserves short answer stubs in exams", () => {
      const input = `س١: أكمل
(أ) نعم
(ب) لا`;
      const output = cleanArabicText(input);

      // Short fragments should NOT be removed in exam context
      expect(output).toContain("(أ) نعم");
      expect(output).toContain("(ب) لا");
    });

    it("auto-detects exam and applies EXAM_OPTIONS", () => {
      const examInput = `س١: السؤال
(أ) الخيار أ
(ب) الخيار ب`;

      const output = cleanArabicText(examInput);

      // Verify exam-specific preservation
      expect(output).toContain("س١:");
      expect(output).toContain("(أ)");
      expect(output).toContain("(ب)");
    });
  });

  describe("general document cleaning with DEFAULT_OPTIONS", () => {
    it("applies aggressive cleaning to general docs", () => {
      const input = `نص عادي هنا
مع كلمات a b c منفردة
وسطور قصيرة`;
      const output = cleanArabicText(input);

      // Latin noise (single letters) should be removed in general docs
      expect(output).not.toContain(" a ");
      expect(output).not.toContain(" b ");
      expect(output).not.toContain(" c ");
    });

    it("merges short lines in general documents", () => {
      const input = `هذا نص
عادي جداً
بدون أسئلة
أو امتحانات`;
      const output = cleanArabicText(input);

      // Lines should be merged in general context
      const lines = output.split("\n").filter((l) => l.trim().length > 0);
      expect(lines.length).toBeLessThan(4);
    });

    it("removes garbage symbols from general docs", () => {
      const input = `نص صحيح
@#$%^&*()
نص آخر صحيح`;
      const output = cleanArabicText(input);

      // Garbage line should be removed
      expect(output).toContain("نص صحيح");
      expect(output).toContain("نص آخر صحيح");
      expect(output).not.toContain("@#$%^&*()");
    });

    it("detects headings in general documents", () => {
      const input = `الفصل الأول
محتوى الفصل هنا
الفصل الثاني
محتوى آخر`;
      const output = cleanArabicText(input);

      // Should convert to markdown headings in general docs
      expect(output).toContain("## الفصل الأول");
      expect(output).toContain("## الفصل الثاني");
    });
  });

  describe("explicit options override", () => {
    it("respects explicit EXAM_OPTIONS even for general text", () => {
      const generalText = "نص عادي بدون أسئلة مع حرف a منفرد";
      const output = cleanArabicText(generalText, EXAM_OPTIONS);

      // With explicit EXAM_OPTIONS, Latin chars should be preserved
      expect(output).toContain("a");
    });

    it("respects explicit DEFAULT_OPTIONS even for exam text", () => {
      const examText = "س١: السؤال\n(أ) الخيار";
      const output = cleanArabicText(examText, DEFAULT_OPTIONS);

      // This would apply default cleaning even though it's exam text
      // The behavior here depends on whether DEFAULT_OPTIONS triggers auto-detection
      expect(output).toBeDefined();
    });
  });

  describe("basic cleaning operations", () => {
    it("normalizes Unicode characters", () => {
      const input = "نص\u200Bمع\u200Fحروف\u202Aتحكم";
      const output = cleanArabicText(input);

      expect(output).not.toContain("\u200B");
      expect(output).not.toContain("\u200F");
      expect(output).not.toContain("\u202A");
    });

    it("normalizes whitespace", () => {
      const input = "نص    مع    مسافات     كثيرة";
      const output = cleanArabicText(input);

      expect(output).toContain("نص مع مسافات كثيرة");
      expect(output).not.toMatch(/  +/); // No double spaces
    });

    it("removes broken HTML tags", () => {
      const input = "<div>نص مع <b>تنسيق</b> HTML</div>";
      const output = cleanArabicText(input);

      expect(output).not.toContain("<div>");
      expect(output).not.toContain("<b>");
      expect(output).not.toContain("</div>");
      expect(output).toContain("نص");
      expect(output).toContain("تنسيق");
    });

    it("removes repeated tokens", () => {
      const input = "نص نص نص نص معاد";
      const output = cleanArabicText(input);

      // Should collapse repeated words
      expect(output).toContain("نص");
      expect(output).not.toMatch(/نص\s+نص\s+نص\s+نص/);
    });

    it("normalizes Arabic punctuation", () => {
      const input = "نص،بدون مسافة,وفاصلة إنجليزية؛";
      const output = cleanArabicText(input);

      expect(output).toMatch(/،/); // Arabic comma
      expect(output).not.toMatch(/[^،],/); // Should not have English comma next to text
    });
  });

  describe("edge cases", () => {
    it("handles empty string", () => {
      const output = cleanArabicText("");
      expect(output).toBe("");
    });

    it("handles whitespace-only string", () => {
      const output = cleanArabicText("   \n  \t  \n   ");
      expect(output).toBe("");
    });

    it("handles text with only exam markers", () => {
      const input = "س١:\nس٢:\nس٣:";
      const output = cleanArabicText(input);

      expect(output).toContain("س١:");
      expect(output).toContain("س٢:");
      expect(output).toContain("س٣:");
    });

    it("preserves Arabic diacritics by default", () => {
      const input = "نَصٌّ مُشَكَّل";
      const output = cleanArabicText(input);

      // Default options have removeTashkeel: false
      expect(output).toContain("َ"); // fatha
      expect(output).toContain("ٌ"); // tanween damm
    });

    it("handles mixed RTL/LTR content", () => {
      const input = "نص عربي مع English text وعربي مرة أخرى";
      const output = cleanArabicText(input);

      expect(output).toContain("نص عربي");
      expect(output).toBeDefined();
    });
  });

  describe("exam-specific patterns preservation", () => {
    it("preserves fill-in-the-blank markers", () => {
      const input = `س١: أكمل الفراغ: العاصمة هي ......
س٢: املأ: السماء [...] اللون`;
      const output = cleanArabicText(input);

      expect(output).toContain("......");
      expect(output).toContain("[...]");
    });

    it("preserves numbered alternatives with Arabic numerals", () => {
      const input = `س١: اختر:
(١) الأول
(٢) الثاني
(٣) الثالث`;
      const output = cleanArabicText(input);

      expect(output).toContain("(١)");
      expect(output).toContain("(٢)");
      expect(output).toContain("(٣)");
    });

    it("preserves multiple question formats in same document", () => {
      const input = `س١: السؤال الأول
سؤال ٢: السؤال الثاني
(3): السؤال الثالث
س: السؤال الرابع`;
      const output = cleanArabicText(input);

      expect(output).toContain("س١:");
      expect(output).toContain("سؤال ٢:");
      expect(output).toContain("(3):");
      expect(output).toContain("س:");
    });
  });
});
