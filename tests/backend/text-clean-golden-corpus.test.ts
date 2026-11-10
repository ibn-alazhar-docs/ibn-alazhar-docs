/**
 * Golden baseline for the Arabic text-cleaning core (packages/pipeline/src/text/clean/**).
 *
 * Captures CURRENT behavior on 2026-11-05 (branch fix/pipeline-runtime-fixes) so the
 * upcoming verification/correction port shows up as reviewable diffs on real Arabic
 * expectations, not opaque snapshots. The repo uses zero Vitest snapshots (grep
 * toMatchSnapshot → 0 hits), so every expectation here is a human-reviewable Arabic
 * string in tests/backend/fixtures/arabic-clean/<id>.<target>.expected.txt.
 *
 * A golden is only written once its output has been read against the source and judged
 * correct. The hazards that were wrong when this corpus was created — Quranic-span
 * corruption, « » stripping, Arabic-Indic page numbers, table mangling, partial merges —
 * are fixed in packages/pipeline/src/text/clean/** and pinned here; each fix also has a
 * red-when-written gate in tests/backend/text-clean-defects.test.ts.
 *
 * Coverage map (hazard → fixture):
 *   Quranic ayah with full tashkeel inside ﴿ ﴾ .... quran-ayah
 *   Hadith inside « » ................................ hadith-quotes
 *   Repeated page headers/footers, ASCII page numbers . page-noise-ascii
 *   Corrupted Arabic-Indic page numbers (٢١٢/١٢٠١/١٢ ١٣ ١٤) page-noise-arabic-indic
 *   OCR line-splitting reconstructed into paragraphs  ocr-line-split
 *   Heading + body structure ........................ heading-body
 *   Markdown + HTML tables with Arabic cells ........ table-mixed
 *   OCR word/phrase stutter (collapseRepeatedWords
 *   capture-group regression) ...................... ocr-stutter
 *   Tatweel / kashida .............................. tatweel-kashida
 *   Orphaned diacritics floating on whitespace ..... orphan-diacritics
 *   Arabic/Latin mixed text ........................ mixed-latin
 *   Footnote / marginalia lines .................... footnotes-marginalia
 *   Doubled OCR paragraph .......................... dupe-paragraph
 *   Mojibake + OCR letter/digit confusions ......... mojibake-ocr
 */

import { describe, expect, it } from "vitest";
import {
  FIXTURE_IDS,
  TARGETS,
  countStrictArabicLetters,
  readExpected,
  readFixture,
  type FixtureId,
} from "./fixtures/arabic-clean/corpus";
import { collapseRepeatedWords } from "@ibn-al-azhar-docs/pipeline/text/clean/index";
import {
  auditContextualGrammar,
  calculateArabicSimilarity,
  normalizeUnicode,
} from "@ibn-al-azhar-docs/pipeline/text";

const PINS: Array<{ id: FixtureId; targets: string[] }> = [
  // D1/D2 fixed: the default pipeline now copies ﴿...﴾ and «...» through verbatim,
  // so the citation fixtures have a full-pipeline baseline, not just a knob.
  { id: "quran-ayah", targets: ["unicode", "pipeline-preserve", "pipeline-default"] },
  { id: "hadith-quotes", targets: ["unicode", "pipeline-preserve-punct", "pipeline-default"] },
  // ASCII page noise is removed correctly at stage level and in the full pipeline.
  { id: "page-noise-ascii", targets: ["page-noise", "pipeline-default"] },
  // D3 fixed: Arabic-Indic furniture (٢١٢ / صفحة ٢١٢ / ١٢٠١) is now recognised, so the
  // fixture has a baseline like its ASCII twin.
  { id: "page-noise-arabic-indic", targets: ["pipeline-default"] },
  // D5 fixed: one pass reaches the fixed point, so the split-line fixture is pinnable.
  { id: "ocr-line-split", targets: ["pipeline-default"] },
  { id: "heading-body", targets: ["detect-headings", "pipeline-default"] },
  // D4 fixed: markdown rows survive and closing tags no longer decay into `</>`.
  { id: "table-mixed", targets: ["pipeline-default"] },
  { id: "ocr-stutter", targets: ["collapse-words", "pipeline-default"] },
  { id: "tatweel-kashida", targets: ["unicode", "pipeline-default"] },
  { id: "orphan-diacritics", targets: ["unicode", "pipeline-default"] },
  { id: "mixed-latin", targets: ["ascii-noise", "pipeline-default"] },
  // Under the explicit exam preset the marginalia survives untouched; and
  // applyQuranicFixes must not gut the proper name "الشمخاوي" via the شمخ rule.
  // D6 fixed: "(١)" no longer misclassifies scholarly prose as an exam paper, so the
  // default preset is now the honest baseline for it too.
  { id: "footnotes-marginalia", targets: ["pipeline-exam", "quranic-fixes", "pipeline-default"] },
  { id: "dupe-paragraph", targets: ["collapse-paragraphs", "pipeline-default"] },
  { id: "mojibake-ocr", targets: ["unicode", "pipeline-default"] },
];

describe("Arabic clean — golden corpus (explicit expected Arabic strings)", () => {
  for (const { id, targets } of PINS) {
    describe(id, () => {
      for (const target of targets) {
        it(`${id} → ${target} matches the recorded baseline`, () => {
          expect(TARGETS[target]!(readFixture(id))).toBe(readExpected(id, target));
        });
      }
    });
  }

  it("every corpus fixture input is realistic Arabic (>= 20 Arabic letters)", () => {
    for (const id of FIXTURE_IDS) {
      expect(countStrictArabicLetters(readFixture(id))).toBeGreaterThanOrEqual(20);
    }
  });
});

// ─── Regression pins for the collapseRepeatedWords capture-group bug ─────────
// The old regex `(${ARABIC_LETTER_CLASS}){2,}(\s+\1){2,}` captured ONE LETTER, so
// the `\1` backref matched a single char and `$1` DELETED the word instead of
// collapsing it. Both collapse branches (word + phrase) must keep the word.

describe("Arabic clean — collapseRepeatedWords regression pins", () => {
  it("collapses a tripled word to one copy (never deletes it)", () => {
    expect(collapseRepeatedWords("قال قال قال الحق")).toBe("قال الحق");
    expect(collapseRepeatedWords("طلب العلم العلم العلم فرض")).toBe("طلب العلم فرض");
  });

  it("collapses a tripled phrase to one copy (never deletes it)", () => {
    expect(collapseRepeatedWords("بيت الله بيت الله بيت الله ساكن")).toBe("بيت الله ساكن");
    expect(collapseRepeatedWords("وجه الله وجه الله وجه الله شرط")).toBe("وجه الله شرط");
  });

  it("leaves double occurrences alone (collapse threshold is three)", () => {
    expect(collapseRepeatedWords("هذا هذا الكلام")).toBe("هذا هذا الكلام");
    expect(collapseRepeatedWords("المسألة مسألة خلاف")).toBe("المسألة مسألة خلاف");
  });
});

// ─── Contextual audit (issue families, no auto-fix) ──────────────────────────

describe("Arabic clean — contextual audit baseline", () => {
  it("flags repeated words in the stutter fixture", () => {
    const result = auditContextualGrammar(readFixture("ocr-stutter"));
    expect(result.wordCount).toBe(56);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "repeated-word", line: 1 }),
        expect.objectContaining({ kind: "repeated-word", line: 3 }),
      ]),
    );
  });

  it("flags hanging diacritics on both lines of the orphan fixture", () => {
    const result = auditContextualGrammar(readFixture("orphan-diacritics"));
    expect(result.wordCount).toBe(28);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "hanging-diacritic", line: 1, severity: "minor" }),
        expect.objectContaining({ kind: "hanging-diacritic", line: 2, severity: "minor" }),
      ]),
    );
  });

  it("flags digit-in-word and tanween-on-alif in the footnote fixture", () => {
    const result = auditContextualGrammar(readFixture("footnotes-marginalia"));
    expect(result.wordCount).toBe(67);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "tanween-on-alif", line: 1 }),
        expect.objectContaining({ kind: "digit-in-word", line: 1 }),
        expect.objectContaining({ kind: "digit-in-word", line: 3 }),
      ]),
    );
  });

  it("reports no hanging diacritics after the unicode pass on a clean Quranic span", () => {
    const ayah = "﴿وَمَنْ أَعْرَضَ عَن ذِكْرِي فَإِنَّ لَهُ مَعِيشَةً ضَنكًا﴾";
    const result = auditContextualGrammar(normalizeUnicode(ayah));
    expect(result.issues.filter((issue) => issue.kind === "hanging-diacritic")).toEqual([]);
  });
});

// ─── Similarity (tashkeel-insensitive OCR-drift detector) ────────────────────

describe("Arabic clean — similarity baseline", () => {
  it("scores a full-tashkeel ayah identical to its tanween-stripped twin", () => {
    const ayah = "وَمَنْ أَعْرَضَ عَن ذِكْرِي فَإِنَّ لَهُ مَعِيشَةً ضَنكًا";
    const result = calculateArabicSimilarity(ayah, ayah.replace(/[ًٍ]/g, ""));
    expect(result).toEqual({
      score: 1,
      tokenScore: 1,
      charScore: 1,
      lengthA: 34,
      lengthB: 34,
      identical: true,
    });
  });
});
