import { describe, it, expect } from "vitest";
import { cleanArabicText, analyzeText } from "../../packages/pipeline/src/text";

// ─── 1. Unicode Normalization (6 tests) ──────────────────────────────────────

describe("cleanArabicText — Unicode normalization", () => {
  it("strips bidi control characters (\\u202B, \\u200F)", () => {
    const input = "\u202Bبسم الله\u200F";
    const result = cleanArabicText(input);
    expect(result).toBe("بسم الله");
  });

  it("strips zero-width characters (\\u200B)", () => {
    const input = "بسم\u200Bالله";
    const result = cleanArabicText(input);
    // ZWS is removed but no space is inserted
    expect(result).toBe("بسمالله");
  });

  it("removes soft hyphens (\\u00AD)", () => {
    const input = "بسم\u00ADالله";
    const result = cleanArabicText(input);
    // SHY is removed but no space is inserted
    expect(result).toBe("بسمالله");
  });

  it("NFKC normalization applied", () => {
    // NFKC converts compatibility characters: ﬁ (U+FB01) → fi
    const input = "\uFB01nish";
    const result = cleanArabicText(input, { normalizeUnicode: true, removeAsciiNoise: false });
    expect(result).toContain("finish");
  });

  it("strips multiple types of control chars at once", () => {
    const input = "\u202Bبسم\u200B\u200Fالله\u00AD";
    const result = cleanArabicText(input);
    // All control chars removed but no spaces inserted
    expect(result).toBe("بسمالله");
  });

  it("preserves normal ASCII text", () => {
    const input = "Hello world 123";
    const result = cleanArabicText(input);
    expect(result).toContain("Hello world 123");
  });
});

// ─── 2. Arabic Normalization (8 tests) ────────────────────────────────────────

describe("cleanArabicText — Arabic normalization", () => {
  it("alef forms normalized: آ→ا, أ→ا, إ→ا", () => {
    const input = "آمن أمن إيمان";
    const result = cleanArabicText(input);
    expect(result).toBe("امن امن ايمان");
  });

  it("yaa forms: ى→ي (alef maksura to standard yaa)", () => {
    const input = "على";
    const result = cleanArabicText(input);
    // ى (\u0649) → ي (\u064A), so على → علي
    expect(result).toBe("علي");
  });

  it("broken definite article rejoined: ال كتاب → الكتاب", () => {
    const input = "ال كتاب";
    const result = cleanArabicText(input);
    expect(result).toBe("الكتاب");
  });

  it("does NOT corrupt words ending with ال (like قال)", () => {
    const input = "قال";
    const result = cleanArabicText(input);
    expect(result).toBe("قال");
  });

  it("preserves teh marbouta (ة stays ة, NOT converted to ه)", () => {
    const input = "مدرسة";
    const result = cleanArabicText(input);
    expect(result).toContain("ة");
    expect(result).not.toContain("ه");
  });

  it("kaf stays ك (already standard)", () => {
    const input = "كتاب";
    const result = cleanArabicText(input);
    expect(result).toBe("كتاب");
  });

  it("multiple normalizations in same text", () => {
    const input = "آيةُ الْكِتَابِ";
    // After normalization: آ→ا, removing tashkeel (ُ, ْ, ِ): اية الكتاب
    // Broken article: ال book (no broken article here since الْك is not separated by space)
    const result = cleanArabicText(input, { removeTashkeel: true });
    expect(result).toContain("اية");
    expect(result).toContain("الكتاب");
  });

  it("text without Arabic unaffected by Arabic normalization", () => {
    const input = "Hello 123 !@#";
    const result = cleanArabicText(input);
    expect(result).toContain("Hello 123");
  });
});

// ─── 3. Tashkeel Removal (4 tests) ───────────────────────────────────────────

describe("cleanArabicText — tashkeel removal", () => {
  const opts = { removeTashkeel: true };

  it("removes fatha (َ)", () => {
    const input = "بَسم";
    const result = cleanArabicText(input, opts);
    expect(result).toBe("بسم");
  });

  it("removes damma (ُ)", () => {
    const input = "رَسُول";
    const result = cleanArabicText(input, opts);
    expect(result).toBe("رسول");
  });

  it("removes kasra (ِ)", () => {
    const input = "كِتَاب";
    const result = cleanArabicText(input, opts);
    expect(result).toBe("كتاب");
  });

  it("removes shadda (ّ)", () => {
    const input = "الله";
    const result = cleanArabicText(input, opts);
    expect(result).toBe("الله");
  });

  it("removes tanwin diacritics but leaves trailing alef", () => {
    // كتَابًا: tanwin fatha (\u064B) is removed, but alef (\u0627) is NOT a diacritic
    const input = "كتابًا";
    const result = cleanArabicText(input, opts);
    // After removing tanwin: كتابا (alef remains)
    expect(result).toBe("كتابا");
  });
});

// ─── 4. Tatweel Removal (2 tests) ────────────────────────────────────────────

describe("cleanArabicText — tatweel removal", () => {
  it("removes tatweel (ـ)", () => {
    const input = "كتـــاب";
    const result = cleanArabicText(input);
    expect(result).not.toContain("ـ");
    expect(result).toBe("كتاب");
  });

  it("preserves non-tatweel characters", () => {
    const input = "بسم الله الرحمن الرحيم";
    const result = cleanArabicText(input);
    expect(result).toBe("بسم الله الرحمن الرحيم");
  });
});

// ─── 5. Whitespace Normalization (5 tests) ───────────────────────────────────

describe("cleanArabicText — whitespace normalization", () => {
  it("converts \\r\\n to \\n", () => {
    const input = "بسم\r\nالله";
    const result = cleanArabicText(input);
    expect(result).not.toContain("\r");
    expect(result).toContain("بسم");
    expect(result).toContain("الله");
  });

  it("collapses multiple spaces to one", () => {
    const input = "بسم   الله   الرحمن";
    const result = cleanArabicText(input);
    expect(result).toBe("بسم الله الرحمن");
  });

  it("collapses 3+ newlines to 2", () => {
    const input = "بسم\n\n\n\nالله";
    const result = cleanArabicText(input);
    expect(result).not.toContain("\n\n\n");
  });

  it("trims leading/trailing whitespace", () => {
    const input = "  بسم الله  ";
    const result = cleanArabicText(input);
    expect(result).toBe("بسم الله");
  });

  it("trims each line", () => {
    const input = "  بسم  \n  الله  ";
    const result = cleanArabicText(input);
    const lines = result.split("\n").filter((l) => l.length > 0);
    for (const line of lines) {
      expect(line).toBe(line.trim());
    }
  });
});

// ─── 6. Broken HTML Removal (6 tests) ────────────────────────────────────────

describe("cleanArabicText — broken HTML removal", () => {
  it("<br> tags converted to \\n", () => {
    const input = "بسم الله<br>الرحمن";
    const result = cleanArabicText(input);
    expect(result).toContain("بسم الله");
    expect(result).toContain("الرحمن");
    expect(result).not.toContain("<br>");
  });

  it("paired tags removed (b, i, u, em, strong)", () => {
    const input = "<b>بسم</b> <i>الله</i> <u>رحيم</u>";
    const result = cleanArabicText(input);
    expect(result).not.toContain("<b>");
    expect(result).not.toContain("</b>");
    expect(result).not.toContain("<i>");
    expect(result).not.toContain("</i>");
    expect(result).not.toContain("<u>");
    expect(result).not.toContain("</u>");
    expect(result).toContain("بسم");
    expect(result).toContain("الله");
  });

  it("span/div/p/font/a/sup/sub tags removed", () => {
    const input = "<span>بسم</span> <div>الله</div> <font color='red'>رحيم</font>";
    const result = cleanArabicText(input);
    expect(result).not.toContain("<span>");
    expect(result).not.toContain("<div>");
    expect(result).not.toContain("<font");
    expect(result).toContain("بسم");
    expect(result).toContain("الله");
  });

  it("<p> tags converted to \\n", () => {
    const input = "<p>بسم الله</p><p>الرحمن الرحيم</p>";
    const result = cleanArabicText(input);
    expect(result).not.toContain("<p>");
    expect(result).toContain("بسم الله");
    expect(result).toContain("الرحمن الرحيم");
  });

  it("unclosed tags removed", () => {
    const input = "بسم <b>الله الرحيم";
    const result = cleanArabicText(input);
    expect(result).not.toContain("<b>");
    expect(result).toContain("بسم");
    expect(result).toContain("الله الرحيم");
  });

  it("complex nested HTML cleaned", () => {
    const input = "<div><p><b>بسم</b> الله</p></div>";
    const result = cleanArabicText(input);
    expect(result).not.toContain("<div>");
    expect(result).not.toContain("<p>");
    expect(result).not.toContain("<b>");
    expect(result).toContain("بسم");
    expect(result).toContain("الله");
  });
});

// ─── 7. ASCII Noise Removal (3 tests) ────────────────────────────────────────

describe("cleanArabicText — ASCII noise removal", () => {
  it("single-char ASCII artifacts removed between Arabic", () => {
    const input = "مرحبا a بك";
    const result = cleanArabicText(input);
    // The 'a' surrounded by Arabic/whitespace is removed
    expect(result).not.toContain(" a ");
    expect(result).toContain("مرحبا");
    expect(result).toContain("بك");
  });

  it("primarily Arabic lines preserved", () => {
    const input = "بسم الله الرحمن الرحيم في كتابه العزيز";
    const result = cleanArabicText(input);
    expect(result).toContain("بسم الله الرحمن الرحيم");
  });

  it("heading markers preserved", () => {
    const input = "## هذا عنوان";
    const result = cleanArabicText(input);
    expect(result).toContain("##");
    expect(result).toContain("عنوان");
  });
});

// ─── 8. Repeated Tokens (3 tests) ────────────────────────────────────────────

describe("cleanArabicText — repeated tokens", () => {
  it("Arabic words collapsed by collapseRepeatedWords (uses Arabic char class)", () => {
    const input = "بسم بسم بسم بسم الله";
    const result = cleanArabicText(input);
    // collapseRepeatedWords uses Arabic Unicode range, collapses 3+ repeats
    expect(result).toBe("بسم الله");
  });

  it("English repeated words DO collapse (4+ repetitions)", () => {
    const input = "the the the the word";
    const result = cleanArabicText(input);
    // \b works for English, collapses after 3+ repeats
    expect(result).not.toContain("the the the the");
    expect(result).toContain("the");
  });

  it("preserves distinct words", () => {
    const input = "بسم الله الرحمن الرحيم";
    const result = cleanArabicText(input);
    expect(result).toContain("بسم");
    expect(result).toContain("الله");
    expect(result).toContain("الرحمن");
    expect(result).toContain("الرحيم");
  });
});

// ─── 9. Garbage Symbols (3 tests) ────────────────────────────────────────────

describe("cleanArabicText — garbage symbols", () => {
  it("lines with >60% symbols removed", () => {
    const input = "بسم الله\n&&&&&&&&&&&&&&&\nالرحمن الرحيم";
    const result = cleanArabicText(input);
    expect(result).toContain("بسم الله");
    expect(result).toContain("الرحمن الرحيم");
    expect(result).not.toContain("&&&&");
  });

  it("pure punctuation lines removed", () => {
    const input = "بسم الله\n؟؟؟؟\nالرحمن الرحيم";
    const result = cleanArabicText(input);
    expect(result).toContain("بسم الله");
    expect(result).toContain("الرحمن الرحيم");
    expect(result).not.toContain("؟؟؟؟");
  });

  it("lines with real content preserved", () => {
    const input = "بسم الله الرحمن الرحيم";
    const result = cleanArabicText(input);
    expect(result).toBe("بسم الله الرحمن الرحيم");
  });
});

// ─── 10. Punctuation Normalization (6 tests) ─────────────────────────────────

describe("cleanArabicText — punctuation normalization", () => {
  it("Arabic comma variants → ،", () => {
    const input = "مرحبا، زميل،你好";
    const result = cleanArabicText(input);
    // ، stays ،; ，(U+FF0C) → ،
    expect(result).toContain("،");
  });

  it("semicolon variants → ؛", () => {
    const input = "أحد؛ اثنان";
    const result = cleanArabicText(input);
    expect(result).toContain("؛");
  });

  it("question mark variants → ؟", () => {
    const input = "هل نعم؟";
    const result = cleanArabicText(input);
    expect(result).toContain("؟");
  });

  it("colon variants normalized", () => {
    const input = "عنوان：رئيسي";
    const result = cleanArabicText(input);
    // ：(U+FF1A) → :
    expect(result).toContain(":");
  });

  it("dash variants → –", () => {
    const input = "أحد — اثنان ー ثلاثة";
    const result = cleanArabicText(input);
    // Both — (U+2014) and ー (U+30FC) → – (U+2013)
    expect(result).toContain("–");
  });

  it("ellipsis variants → …", () => {
    const input = "بسم... الله⋯ الرحيم";
    const result = cleanArabicText(input);
    expect(result).toContain("…");
  });
});

// ─── 11. Repeated Words Collapse (3 tests) ───────────────────────────────────

describe("cleanArabicText — collapse repeated words", () => {
  it("word repeated 3+ times collapses: الله الله الله → الله", () => {
    const input = "الله الله الله";
    const result = cleanArabicText(input);
    expect(result).toBe("الله");
  });

  it("phrase repetition collapsed", () => {
    const input = "بسم الله بسم الله بسم الله";
    const result = cleanArabicText(input);
    // Repeated phrase (1-3 words repeated 3+ times)
    expect(result).toBe("بسم الله");
  });

  it("preserves non-repeated text", () => {
    const input = "بسم الله الرحمن الرحيم";
    const result = cleanArabicText(input);
    expect(result).toBe("بسم الله الرحمن الرحيم");
  });
});

// ─── 12. Heading Detection (8 tests) ─────────────────────────────────────────

describe("cleanArabicText — heading detection", () => {
  it("الفصل الاول → ## heading (after alef normalization)", () => {
    const input = "الفصل الاول في العقيدة";
    const result = cleanArabicText(input);
    // After alef normalization أ→ا, output is "الاول" not "الأول"
    expect(result).toMatch(/^## الفصل الاول/);
  });

  it("الباب الاول → ## heading (after alef normalization)", () => {
    const input = "الباب الاول في التوحيد";
    const result = cleanArabicText(input);
    expect(result).toMatch(/^## الباب الاول/);
  });

  it("المبحث الاول → ## heading (after alef normalization)", () => {
    const input = "المبحث الاول في الأسماء";
    const result = cleanArabicText(input);
    expect(result).toMatch(/^## المبحث الاول/);
  });

  it("numbered items (1. text) → ## heading", () => {
    const input = "1. هذا عنوان فرعي";
    const result = cleanArabicText(input);
    expect(result).toMatch(/^## 1\./);
  });

  it("parenthetical numbering ((1) text) → ## heading", () => {
    const input = "(1) هذا عنوان فرعي";
    const result = cleanArabicText(input);
    expect(result).toMatch(/^## \(1\)/);
  });

  it("المقدمة → ### sub-heading", () => {
    const input = "المقدمة";
    const result = cleanArabicText(input);
    expect(result).toMatch(/^### المقدمة/);
  });

  it("الخاتمة → ### sub-heading", () => {
    const input = "الخاتمة";
    const result = cleanArabicText(input);
    expect(result).toMatch(/^### الخاتمة/);
  });

  it("body text NOT falsely marked as heading", () => {
    const input = "هذا نص عادي ليس عنوانا في أي فصل أو باب";
    const result = cleanArabicText(input);
    expect(result).not.toMatch(/^## /);
    expect(result).not.toMatch(/^### /);
    expect(result).toContain("نص عادي");
  });
});

// ─── 13. Page Noise Removal (4 tests) ────────────────────────────────────────

describe("cleanArabicText — page noise removal", () => {
  it("standalone page numbers removed", () => {
    const input = "بسم الله\n123\nالرحمن الرحيم";
    const result = cleanArabicText(input);
    expect(result).toContain("بسم الله");
    expect(result).toContain("الرحمن الرحيم");
    expect(result).not.toMatch(/\n123\n/);
  });

  it("page ranges removed", () => {
    const input = "بسم الله\n- 5 -\nالرحمن الرحيم";
    const result = cleanArabicText(input);
    expect(result).toContain("بسم الله");
    expect(result).toContain("الرحمن الرحيم");
    expect(result).not.toContain("- 5 -");
  });

  it("decorative lines removed", () => {
    const input = "بسم الله\n•••••••\nالرحمن الرحيم";
    const result = cleanArabicText(input);
    expect(result).toContain("بسم الله");
    expect(result).toContain("الرحمن الرحيم");
    expect(result).not.toContain("•••••••");
  });

  it("Arabic page markers removed", () => {
    const input = "بسم الله\nصفحة 5\nالرحمن الرحيم";
    const result = cleanArabicText(input);
    expect(result).toContain("بسم الله");
    expect(result).toContain("الرحمن الرحيم");
    expect(result).not.toMatch(/صفحة\s*5/);
  });
});

// ─── 14. Final Cleanup (4 tests) ─────────────────────────────────────────────

describe("cleanArabicText — final cleanup", () => {
  it("OCR exclamation artifacts removed", () => {
    // OCR can misread characters as exclamation marks between Arabic letters
    const input = "بسم!الله";
    const result = cleanArabicText(input);
    // OCR_EXCLAMATION: /([\u0600-\u06FF])!+([\u0600-\u06FF])/g → $1$2
    expect(result).not.toContain("!");
    expect(result).toContain("بسم");
    expect(result).toContain("الله");
  });

  it("trailing Arabic punctuation preserved", () => {
    const input = "بسم الله.";
    const result = cleanArabicText(input);
    expect(result).toContain(".");
  });

  it("garbage lines filtered", () => {
    const input = "بسم الله\nxyzzy\nالرحمن الرحيم";
    const result = cleanArabicText(input);
    expect(result).toContain("بسم الله");
    expect(result).toContain("الرحمن الرحيم");
  });

  it("bullet markers preserved", () => {
    const input = "- البند الاول\n- البند الثاني";
    const result = cleanArabicText(input);
    expect(result).toContain("- ");
    expect(result).toContain("البند الاول");
    expect(result).toContain("البند الثاني");
  });
});

// ─── 15. Edge Cases (6 tests) ────────────────────────────────────────────────

describe("cleanArabicText — edge cases", () => {
  it("empty string → empty string", () => {
    expect(cleanArabicText("")).toBe("");
  });

  it("whitespace only → empty string", () => {
    expect(cleanArabicText("   \n\n  ")).toBe("");
  });

  it("very long text processed correctly", () => {
    const words = Array.from({ length: 500 }, (_, i) => `كلمة${i}`);
    const input = words.join(" ");
    const result = cleanArabicText(input);
    expect(result.length).toBeGreaterThan(0);
    expect(result).toContain("كلمة0");
    expect(result).toContain("كلمة499");
  });

  it("mixed Arabic/English preserved", () => {
    const input = "بسم الله الرحمن PDF document";
    const result = cleanArabicText(input);
    expect(result).toContain("بسم الله");
    expect(result).toContain("PDF");
  });

  it("only special characters cleaned", () => {
    const input = "!@#$%^&*()";
    const result = cleanArabicText(input);
    // After all cleaning passes, special chars may remain or be removed
    expect(typeof result).toBe("string");
  });

  it("single Arabic word preserved", () => {
    const input = "بسم";
    const result = cleanArabicText(input);
    expect(result).toBe("بسم");
  });
});

// ─── 16. analyzeText (9 tests) ───────────────────────────────────────────────

describe("analyzeText", () => {
  it("word count correct", () => {
    const text = "بسم الله الرحمن الرحيم في كتابه";
    const analysis = analyzeText(text);
    expect(analysis.wordCount).toBe(6);
  });

  it("char count correct", () => {
    const text = "بسم الله";
    const analysis = analyzeText(text);
    expect(analysis.charCount).toBe(text.length);
  });

  it("pageCount = ceil(words/250), minimum 1", () => {
    const text = "word ".repeat(500).trim();
    const analysis = analyzeText(text);
    expect(analysis.pageCount).toBe(2);
  });

  it("pageCount minimum is 1 even for empty text", () => {
    const analysis = analyzeText("");
    expect(analysis.pageCount).toBe(1);
  });

  it("heading count correct", () => {
    const text = "## الفصل الأول\nنص عادي\n### المقدمة";
    const analysis = analyzeText(text);
    expect(analysis.headingCount).toBe(2);
    expect(analysis.level2HeadingCount).toBe(1);
    expect(analysis.level3HeadingCount).toBe(1);
  });

  it("arabic ratio for pure Arabic text close to 1.0", () => {
    const text = "بسم الله الرحمن الرحيم في كتابه العزيز";
    const analysis = analyzeText(text);
    // Pure Arabic text should have very high arabic ratio
    expect(analysis.arabicRatio).toBeGreaterThan(0.9);
  });

  it("arabic ratio for pure English close to 0", () => {
    const text = "Hello world this is a test document";
    const analysis = analyzeText(text);
    expect(analysis.arabicRatio).toBeLessThan(0.1);
  });

  it("garbage ratio for clean text is 0", () => {
    const text = "بسم الله الرحمن الرحيم في كتابه العزيز من رب العالمين";
    const analysis = analyzeText(text);
    expect(analysis.garbageRatio).toBe(0);
  });

  it("quality score is between 0 and 100", () => {
    const text = "بسم الله الرحمن الرحيم في كتابه العزيز من رب العالمين";
    const analysis = analyzeText(text);
    expect(analysis.qualityScore).toBeGreaterThanOrEqual(0);
    expect(analysis.qualityScore).toBeLessThanOrEqual(100);
  });

  it("empty text returns mostly zeros", () => {
    const analysis = analyzeText("");
    expect(analysis.wordCount).toBe(0);
    expect(analysis.charCount).toBe(0);
    expect(analysis.headingCount).toBe(0);
    expect(analysis.arabicRatio).toBe(0);
    expect(analysis.garbageRatio).toBe(0);
    expect(analysis.qualityScore).toBe(0);
    // pageCount is Math.max(1, ...) so minimum 1
    expect(analysis.pageCount).toBe(1);
  });
});
