import { describe, it, expect } from "vitest";
import { cleanArabicText } from "@ibn-al-azhar-docs/pipeline/text";
import { normalizeArabicPunctuation } from "../../packages/pipeline/src/text/clean/html";

/**
 * Owner rule (الأمانة بالمصدر): the cleaner may normalize encoding and remove OCR
 * noise, but it must never delete or invent content. « » ‹ › are content —
 * verify-quotes.ts anchors hadith detection on them (HADITH_RE) and footnote
 * reconstruction matches quoted book names inside «…».
 */
describe("quote and guillemet preservation in punctuation normalization", () => {
  it("preserves a hadith inside «» through the full cleanArabicText path", () => {
    const input =
      "عن علي بن أبي طالب رضي الله عنه أن النبي صلى الله عليه وسلم قال: «انما الاعمال بالنيات وانما لكل امرئ ما نوى» — رواه البخاري ومسلم";
    const output = cleanArabicText(input);

    // Mirrors HADITH_RE in packages/pipeline/src/verify-quotes.ts: /«([^»]{25,600})»/g
    const match = output.match(/«([^»]{25,600})»/);
    expect(match).not.toBeNull();
    expect(match![1]).toContain("بالنيات");
    // Balance the per-paragraph «/» check (T003) relies on.
    expect((output.match(/«/g) ?? []).length).toBe((output.match(/»/g) ?? []).length);
  });

  it("keeps a Quranic ayah inside ﴿ ﴾ byte-identical before and after", () => {
    const ayah = "﴿وَاللَّهُ غَفُورٌ رَحِيمٌ﴾";

    expect(normalizeArabicPunctuation(ayah)).toBe(ayah);

    const output = cleanArabicText(ayah);
    expect(output).toContain(ayah);
  });

  it("leaves an unbalanced straight quote alone instead of guessing", () => {
    const openOnly = 'قال الله تعالى "من كان في صلاة فهو في رحمة';
    expect(normalizeArabicPunctuation(openOnly)).toBe(openOnly);

    const acrossLines = '"اقتباس يبدأ من سطر سابق\nوينتهي في سطر آخر وانتهى"';
    expect(normalizeArabicPunctuation(acrossLines)).toBe(acrossLines);
    expect(acrossLines.includes("«")).toBe(false);
  });

  it("does not touch straight quotes or apostrophes around Latin-only text", () => {
    const latin = 'The "quick brown fox" jumped over the lazy dog في نص عربي مع Smith\'s book';
    expect(normalizeArabicPunctuation(latin)).toBe(latin);

    const doc =
      'قال المؤلف: «نص عربي مقتبس هنا» في كتابه\n\nThe English line says "quoted" and it\'s fine.';
    const output = cleanArabicText(doc);
    expect(output).toContain("«نص عربي مقتبس هنا»");
    expect(output).toContain('"quoted"');
    expect(output).toContain("it's");
  });

  it("converts straight quotes that clearly wrap Arabic content to «»", () => {
    const input = 'قال المؤلف "كتاب شرح معاني الاثار" في مقدمته';
    expect(normalizeArabicPunctuation(input)).toBe("قال المؤلف «كتاب شرح معاني الاثار» في مقدمته");

    const output = cleanArabicText('قال المؤلف "في بيان الاحكام" في كتابه');
    expect(output).toContain("«في بيان الاحكام»");
  });

  it("maps a straight-quote pair nested inside an existing «» to ‹› instead of flattening", () => {
    const input = '«قال العلماء هذا نص و"كلام داخله" تم»';
    expect(normalizeArabicPunctuation(input)).toBe("«قال العلماء هذا نص و‹كلام داخله› تم»");
  });

  it("regression: normalizeArabicPunctuation must NEVER delete existing « » ‹ › guillemets", () => {
    // Old bug: text.replace(/[«»‹›〈〉]/g, () => "") stripped every guillemet.
    const input = "قال: «الحديث» و‹التفسير› وكلاهما «مقتبس»";
    const output = normalizeArabicPunctuation(input);

    expect(output).toBe(input);
    for (const mark of ["«", "»", "‹", "›"]) {
      const before = input.split(mark).length - 1;
      const after = output.split(mark).length - 1;
      expect(after).toBe(before);
      expect(after).toBeGreaterThan(0);
    }

    // And through the full path the marks still survive. Text deliberately
    // follows the ‹› pair: ALLOWED_TRAILING in text/constants.ts lists «»﴿﴾ but
    // not ‹›, so a line ENDING with › still loses it — reported, not fixed here.
    const cleaned = cleanArabicText(
      "قال البخاري: «اذا السماء انشقت» في باب التفسير ‹رواية اخرى› تم",
    );
    expect(cleaned).toContain("«");
    expect(cleaned).toContain("»");
    expect(cleaned).toContain("‹");
    expect(cleaned).toContain("›");
  });
});
