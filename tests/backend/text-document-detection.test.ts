import { describe, it, expect } from "vitest";
import { detectDocumentType } from "@ibn-al-azhar-docs/pipeline/text";

describe("detectDocumentType", () => {
  describe("exam detection", () => {
    it("detects exam with س\\d+ pattern", () => {
      const text = "س١: ما هو الحل؟\nس٢: كيف يعمل؟\nس٣: متى نستخدمه؟";
      expect(detectDocumentType(text)).toBe("exam");
    });

    it("detects exam with mixed Arabic/Latin question numbers", () => {
      const text = "س1: السؤال الأول\nس5: السؤال الخامس\nس10: السؤال العاشر";
      expect(detectDocumentType(text)).toBe("exam");
    });

    it("detects exam with answer choices (أ), (ب), (ج)", () => {
      const text = `س١: اختر الإجابة الصحيحة:
(أ) الخيار الأول
(ب) الخيار الثاني
(ج) الخيار الثالث
(د) الخيار الرابع`;
      expect(detectDocumentType(text)).toBe("exam");
    });

    it("detects exam with سؤال pattern with multiple occurrences", () => {
      // سؤال pattern alone gives +3, need at least 3 occurrences for +3 bonus = 6 total
      const text = "سؤال ١: ما هي الإجابة؟\nسؤال ٢: اشرح المفهوم\nسؤال ٣: قارن بين\nسؤال ٤: اذكر";
      expect(detectDocumentType(text)).toBe("exam");
    });

    it("detects exam with answer markers", () => {
      const text = `س١: السؤال
ج: الإجابة هنا
س٢: سؤال آخر
الجواب: هذه هي الإجابة`;
      expect(detectDocumentType(text)).toBe("exam");
    });

    it("detects exam with MCQ pattern combined with other signals", () => {
      // MCQ pattern alone (score=2) + choice pattern (score=2) = 4 (threshold)
      const text = "اختر: (أ) خيار (ب) خيار آخر (ج) ثالث (د) رابع\nسؤال ١: اختر الصح";
      expect(detectDocumentType(text)).toBe("exam");
    });

    it("detects exam with fill-in-the-blank patterns", () => {
      const text = `س١: أكمل: العاصمة هي ......
س٢: املأ الفراغ: السماء [...] اللون
س٣: ضع في الفراغ (...)`;
      expect(detectDocumentType(text)).toBe("exam");
    });

    it("detects exam with numbered parentheses pattern", () => {
      const text = "(1): السؤال الأول\n(2): السؤال الثاني\n(3): السؤال الثالث";
      expect(detectDocumentType(text)).toBe("exam");
    });
  });

  describe("general document detection", () => {
    it("detects general document without exam patterns", () => {
      const text = `مقدمة

هذا نص عادي بدون أسئلة أو امتحانات. يحتوي على فقرات متعددة ومحتوى نصي عادي.

الفصل الأول
محتوى الفصل الأول هنا.`;
      expect(detectDocumentType(text)).toBe("general");
    });

    it("detects general document with narrative text", () => {
      const text = "كان ياما كان في قديم الزمان. حكاية طويلة عن أحداث كثيرة.";
      expect(detectDocumentType(text)).toBe("general");
    });

    it("detects general document with article content", () => {
      const text = `العنوان الرئيسي

المقدمة تشرح الموضوع بشكل عام. ثم ننتقل إلى التفاصيل في الفقرات التالية.

الخلاصة والنتائج.`;
      expect(detectDocumentType(text)).toBe("general");
    });
  });

  describe("score threshold behavior", () => {
    it("requires score ≥4 for exam classification", () => {
      // Single weak signal (fill-in pattern only, score=1) → general
      const text = "املأ الفراغ: ... في هذا النص العادي";
      expect(detectDocumentType(text)).toBe("general");
    });

    it("classifies as exam when score reaches threshold", () => {
      // Multiple signals: question pattern (3) + answer choices (2) = 5 → exam
      const text = "س١: السؤال\n(أ) خيار أول\n(ب) خيار ثاني";
      expect(detectDocumentType(text)).toBe("exam");
    });

    it("counts multiple question occurrences for bonus score", () => {
      // Three س\d+ patterns → gets +3 bonus → exam
      const text = "س١: أول\nس٢: ثاني\nس٣: ثالث";
      expect(detectDocumentType(text)).toBe("exam");
    });
  });

  describe("edge cases", () => {
    it("handles empty text", () => {
      expect(detectDocumentType("")).toBe("general");
    });

    it("handles very short text with question pattern", () => {
      // Short text but س١ pattern (score=3) + count bonus (1 occurrence, no bonus) = 3 (below threshold)
      // Need to add more context to reach threshold
      const text = "س١: سؤال\n(أ) جواب"; // +3 (question) +2 (choice) = 5
      expect(detectDocumentType(text)).toBe("exam");
    });

    it("handles text with mixed content", () => {
      // Strong exam signals should override general text
      const text = `مقدمة عامة هنا.

س١: السؤال الأول
(أ) الخيار الأول
(ب) الخيار الثاني

س٢: السؤال الثاني
ج: الإجابة`;
      expect(detectDocumentType(text)).toBe("exam");
    });

    it("samples only first 3000 characters for performance", () => {
      // Create text longer than 3000 chars with exam patterns in first part
      const examPart = "س١: سؤال\n".repeat(50); // Strong exam signal
      const generalPart = "نص عادي طويل جداً. ".repeat(500);
      const longText = examPart + generalPart;
      
      expect(longText.length).toBeGreaterThan(3000);
      expect(detectDocumentType(longText)).toBe("exam");
    });

    it("handles text with numbers but no exam patterns", () => {
      const text = "الفصل 1 يتحدث عن الموضوع. القسم 2 يشرح التفاصيل.";
      expect(detectDocumentType(text)).toBe("general");
    });
  });

  describe("multiple pattern combinations", () => {
    it("detects exam with question + answer + choice patterns", () => {
      const text = `س١: اختر الإجابة
(أ) الأول
(ب) الثاني
ج: الأول صحيح`;
      expect(detectDocumentType(text)).toBe("exam");
    });

    it("detects exam with various question formats", () => {
      const text = `س١: سؤال
سؤال ٢: آخر
(3): ثالث
س: رابع`;
      expect(detectDocumentType(text)).toBe("exam");
    });

    it("combines fill-in and MCQ patterns", () => {
      const text = `املأ: (١) الأول ... (٢) الثاني [...]
اختر: (أ) خيار (ب) آخر`;
      expect(detectDocumentType(text)).toBe("exam");
    });
  });
});
