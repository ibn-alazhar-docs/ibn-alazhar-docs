import { describe, it, expect } from "vitest";
import { cleanArabicText, analyzeText } from "../../packages/pipeline/src/text";
import { generateMarkdown } from "../../packages/pipeline/src/output";

const RAW_OCR_SAMPLE = `
\u202Bبسم الله الرحمن الرحيم\u200F
<br>
## الفصل الاول في التوحيد
<b>الحمد لله</b> رب العالمين والصلاة والسلام على <i>رسول الله</i>
محمد بن عبدالله صلى الله عليه وسلم

### المقدمة
إن هذا الكتاب يتناول موضوع التوحيد وهو أهم ما في الاسلام
وقد قسمناه الى عدة فصول ومباحث

123
- 5 -

## الفصل الثاني في الفقه
<b>المبحث الاول</b> في الطهارة
الطهارة لغة النظافة وشرعا إزالة الحدث أو الخبث
`;

const RAW_OCR_CORRUPTED = `
\u202B\u200F\u200Bآية الكرسي\u00AD
الله!!لا إله إلا هو الحي!!القيوم
لا تأخذه سنة ولا نوم
&&&&&&&&&&&&&&&&
؟؟؟؟؟؟؟؟
بسم بسم بسم بسم بسم
الله الله الله الله
`;

const RAW_OCR_TABLE = `
## جدول المحتويات
| الفصل | الموضوع | الصفحة |
|-------|---------|--------|
| الأول | التوحيد | 1 |
| الثاني | الفقه | 25 |
| الثالث | السيرة | 50 |
`;

describe("OCR → Cleanup → Markdown: Full pipeline flow", () => {
  it("raw OCR text produces valid markdown output", () => {
    const result = generateMarkdown(RAW_OCR_SAMPLE);

    expect(result.markdown.length).toBeGreaterThan(0);
    expect(result.metadata.wordCount).toBeGreaterThan(0);
    expect(result.metadata.pageCount).toBeGreaterThanOrEqual(1);
    expect(typeof result.markdown).toBe("string");
  });

  it("bidi control characters removed from final markdown", () => {
    const result = generateMarkdown(RAW_OCR_SAMPLE);

    expect(result.markdown).not.toContain("\u202B");
    expect(result.markdown).not.toContain("\u200F");
    expect(result.markdown).not.toContain("\u200B");
  });

  it("HTML tags stripped from final markdown", () => {
    const result = generateMarkdown(RAW_OCR_SAMPLE);

    expect(result.markdown).not.toContain("<b>");
    expect(result.markdown).not.toContain("</b>");
    expect(result.markdown).not.toContain("<i>");
    expect(result.markdown).not.toContain("<br>");
  });

  it("page noise (standalone numbers, page markers) removed", () => {
    const result = generateMarkdown(RAW_OCR_SAMPLE);

    expect(result.markdown).not.toMatch(/\n123\n/);
    expect(result.markdown).not.toContain("- 5 -");
  });

  it("heading structure preserved through pipeline", () => {
    const result = generateMarkdown(RAW_OCR_SAMPLE);

    expect(result.markdown).toContain("##");
    expect(result.markdown).toContain("###");
    expect(result.metadata.headingCount).toBeGreaterThanOrEqual(2);
  });

  it("corrupted OCR text cleaned and recoverable", () => {
    const result = generateMarkdown(RAW_OCR_CORRUPTED);

    expect(result.markdown).not.toContain("\u202B");
    expect(result.markdown).not.toContain("\u00AD");
    expect(result.markdown).not.toContain("&&&&");
    expect(result.markdown).not.toContain("؟؟؟؟؟؟؟؟");
    expect(result.markdown).toContain("الله");
  });

  it("repeated words collapsed in final output", () => {
    const cleaned = cleanArabicText(RAW_OCR_CORRUPTED);
    expect(cleaned).not.toContain("الله الله الله الله");
    expect(cleaned).not.toContain("بسم بسم بسم بسم");
  });

  it("OCR exclamation artifacts between Arabic letters removed", () => {
    const cleaned = cleanArabicText(RAW_OCR_CORRUPTED);
    expect(cleaned).not.toMatch(/[\u0600-\u06FF]![\u0600-\u06FF]/);
  });

  it("table rows preserved through pipeline", () => {
    const result = generateMarkdown(RAW_OCR_TABLE);

    expect(result.markdown).toContain("|");
    expect(result.markdown).toContain("التوحيد");
    expect(result.markdown).toContain("الفقه");
  });

  it("metadata accurately reflects the processed content", () => {
    const result = generateMarkdown(RAW_OCR_SAMPLE);

    expect(result.raw).toBe(RAW_OCR_SAMPLE);
    expect(result.cleaned).not.toBe(RAW_OCR_SAMPLE);
    expect(result.metadata.confidence).toBeGreaterThan(0);
    expect(result.metadata.garbageRatio).toBeLessThan(0.5);
    expect(result.metadata.qualityScore).toBeGreaterThanOrEqual(0);
    expect(result.metadata.qualityScore).toBeLessThanOrEqual(100);
  });

  it("empty raw text produces empty result gracefully", () => {
    const result = generateMarkdown("");

    expect(result.markdown).toBe("");
    expect(result.metadata.wordCount).toBe(0);
    expect(result.metadata.pageCount).toBe(1);
  });

  it("analyzeText on cleaned output matches metadata from generateMarkdown", () => {
    const result = generateMarkdown(RAW_OCR_SAMPLE);
    const analysis = analyzeText(result.cleaned, result.metadata.pageCount);

    expect(analysis.wordCount).toBe(result.metadata.wordCount);
    expect(analysis.headingCount).toBe(result.metadata.headingCount);
    expect(analysis.arabicRatio).toBeCloseTo(result.metadata.confidence, 1);
  });
});
