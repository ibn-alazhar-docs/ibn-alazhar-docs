/**
 * Regression gates for the Arabic cleaning layer. Each test asserts the CORRECT
 * behavior; all of them were RED when written (2026-11-05) and are GREEN now that
 * D1-D8 are fixed. They stay because the fidelity rule — the produced file is a
 * faithful copy of the source — is what the port must never regress past.
 * Do not "fix" these tests by weakening them; fix the source instead.
 */

import { describe, expect, it } from "vitest";
import { quranicSpans, readFixture } from "./fixtures/arabic-clean/corpus";
import { cleanArabicText, detectDocumentType } from "@ibn-al-azhar-docs/pipeline/text";

describe("DEFECTS — citation protection (regression gate: red when written, green now)", () => {
  it("D1 (critical): cleanArabicText defaults must not alter a Quranic span inside ﴿ ﴾", () => {
    // Before the fix: "أَعْرَضَ"→"اَعْرَضَ", "فَإِنَّ"→"فَاِنَّ", "أَعْمَىٰ"→"اَعْمَيٰ" —
    // normalizeArabic:true rewrites hamza/yaa INSIDE the protected citation.
    const input = readFixture("quran-ayah");
    expect(quranicSpans(cleanArabicText(input))).toEqual(quranicSpans(input));
  });

  it("D2 (critical): « » hadith delimiters must survive the default pipeline", () => {
    // Before the fix: normalizeArabicPunctuation (clean/html.ts:75) deletes « » ‹ › 〈 〉
    // unconditionally, so the hadith text becomes unquoted and merges into the riwaya.
    const out = cleanArabicText(readFixture("hadith-quotes"));
    expect(out).toContain("«إنما الأعمال");
    expect(out).toContain("ما نوى»");
    expect(out.match(/«/g) ?? []).toHaveLength(2);
    expect(out.match(/»/g) ?? []).toHaveLength(2);
  });

  it("D2b (high): hadith wording itself must not be hamza-rewritten by defaults", () => {
    // Before the fix: "إنما"→"انما", "حتى"→"حتي" inside the quoted hadith.
    const out = cleanArabicText(readFixture("hadith-quotes"));
    expect(out).toContain("قال رسول الله صلى الله عليه وسلم");
  });
});

describe("DEFECTS — page noise and pagination artifacts", () => {
  it("D3 (high): Arabic-Indic page numbers must be recognized as page noise", () => {
    // Before the fix: PAGE_NUM_PATTERNS (text/constants.ts:105-114) use ASCII `\d`, so
    // "٢١٢", "صفحة ٢١٢", "١٢٠١" and "١٢ ١٣ ١٤" all survive cleanArabicText.
    const out = cleanArabicText(readFixture("page-noise-arabic-indic"));
    expect(out).not.toContain("٢١٢");
    expect(out).not.toContain("صفحة ٢١٢");
    expect(out).not.toContain("١٢٠١");
    expect(out).not.toContain("١٢ ١٣ ١٤");
  });
});

describe("DEFECTS — structure integrity", () => {
  it("D4 (high): markdown table rows and HTML tags must survive the pipeline", () => {
    // Before the fix: reconstructArabicLines has no `|` guard, so rows merge/sever, the
    // "| --- |" separator line is deleted by removePageNoise, and removeBrokenHtml
    // leaves `</td>`/`</table>` (only opening tags match) which removeAsciiNoise then
    // guts into `</>` — producing "الكتاب</>المؤلف</>..." in the output.
    const out = cleanArabicText(readFixture("table-mixed"));
    expect(out).not.toMatch(/<\//);
    const tableRows = out.split("\n").filter((line) => line.trimStart().startsWith("|"));
    // header + separator + 2 markdown rows + the 2 HTML rows, which now arrive as
    // table rows too: a row is a row whatever its source markup.
    expect(tableRows).toHaveLength(6);
    expect(out).toContain("| --- | --- | --- |");
  });

  it("D4b (critical): HTML table cells must never fuse into one word", () => {
    // "<td>الكتاب</td><td>المؤلف</td>" stripped to nothing produced "الكتابالمؤلف" —
    // two cell values welded into a word that exists in neither the source nor any
    // dictionary. The fidelity rule forbids inventing tokens.
    const out = cleanArabicText(readFixture("table-mixed"));
    expect(out).not.toContain("الكتابالمؤلف");
    expect(out).toContain("الكتاب");
    expect(out).toContain("المؤلف");
  });

  it("D5 (medium): OCR line reconstruction must reach a fixed point in one pass", () => {
    // Before the fix: pass 1 fully merges paragraph 1 but leaves paragraph 2 as
    // "...الاحكام\nالشرعية..." — a second cleanArabicText pass merges it, so the
    // pipeline is NOT idempotent on this fixture.
    const once = cleanArabicText(readFixture("ocr-line-split"));
    expect(cleanArabicText(once)).toBe(once);
  });

  it("D6 (medium): a tafsir text with (١) footnote markers is not an exam document", () => {
    // Before the fix: detectDocumentType scores "(١)" via EXAM_CHOICE/MCQ patterns and
    // returns "exam", silently switching the whole cleaning preset (no reconstruction,
    // no finalCleanup) for scholarly footnoted prose.
    expect(detectDocumentType(readFixture("footnotes-marginalia"))).toBe("general");
  });

  it("D6b (critical): a footnote marker must not lose its opening bracket", () => {
    // finalCleanup's LEADING_JUNK protected «»‹›﴿﴾ and `|` but not ( ) [ ], so a line
    // starting with the scholarly markers "(١) قال المحقق" / "[2] انظر" came back as
    // "١) قال المحقق" / "2] انظر" — an unbalanced bracket that breaks the reference
    // and any downstream footnote parsing.
    const out = cleanArabicText(readFixture("footnotes-marginalia"));
    expect(out).toContain("(١) قال المحقق");
    expect(out).toContain("[2] انظر");
    for (const line of out.split("\n")) {
      const opens = (line.match(/[([]/g) ?? []).length;
      const closes = (line.match(/[)\]]/g) ?? []).length;
      expect(opens).toBe(closes);
    }
  });
});

describe("DEFECTS — mixed-script over-eagerness", () => {
  it("D7 (minor): legitimate short Latin units must not vanish from Arabic lines", () => {
    // Before the fix: removeAsciiNoise deletes `\b[a-zA-Z]{1,2}\b` on Arabic-dominant
    // lines, so "25 mg" becomes "25" and doses/units are silently lost.
    const out = cleanArabicText(readFixture("mixed-latin"));
    expect(out).toContain("mg");
  });
});

describe("DEFECTS — normalization fixed point (letter/mark composition)", () => {
  // Flattening آ/إ/أ/ى is the inverse of Unicode composition, so the released hamza or
  // madda recomposed on the next pass and vanished one mark at a time. Every spelling
  // below renders identically and must reach the same result in ONE pass.
  const spellings = [
    "آٓ", // composed madda + written madda
    "أٓ", // composed hamza-above + madda
    "إٓ", // composed hamza-below + madda
    "ىٔ", // alef maqsura + hamza above
    "ؤ", // waw + hamza above
    "آ ـ ٓ", // kashida between letter and mark (removed by the tatweel pass)
    "آ  ٓ", // space between them
  ];

  it("D8 (critical): one pass reaches the fixed point for every alef spelling", () => {
    for (const s of spellings) {
      const once = cleanArabicText(s);
      expect(cleanArabicText(once), s).toBe(once);
    }
  });

  it("D8b (critical): no mark silently disappears on the second pass", () => {
    for (const s of spellings) {
      const once = cleanArabicText(s);
      expect([...cleanArabicText(once)].length, s).toBe([...once].length);
    }
  });
});
