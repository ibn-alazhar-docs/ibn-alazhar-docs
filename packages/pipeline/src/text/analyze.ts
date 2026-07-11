export interface TextAnalysis {
  pageCount: number;
  headingCount: number;
  level1HeadingCount: number;
  level2HeadingCount: number;
  level3HeadingCount: number;
  wordCount: number;
  charCount: number;
  arabicRatio: number;
  garbageRatio: number;
  htmlFragmentCount: number;
  paragraphCount: number;
  qualityScore: number;
}

export function analyzeText(text: string, knownPageCount?: number): TextAnalysis {
  const lines = text.split("\n").filter(Boolean);
  const level1Headings = lines.filter((l) => l.startsWith("# ")).length;
  const level2Headings = lines.filter((l) => l.startsWith("## ")).length;
  const level3Headings = lines.filter((l) => l.startsWith("### ")).length;
  const headings = level1Headings + level2Headings + level3Headings;
  const words = text.split(/\s+/).filter(Boolean);
  const arabicChars = (text.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g) || []).length;
  const totalChars = text.replace(/\s/g, "").length;
  const arabicRatio = totalChars > 0 ? arabicChars / totalChars : 0;

  const nonEmptyLines = lines.filter((l) => l.trim().length > 5);
  const garbageLines = nonEmptyLines.filter((l) => {
    const chars = l.replace(/\s/g, "");
    if (chars.length < 5) return false;
    const arabicCount = (chars.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g) || []).length;
    return arabicCount / chars.length < 0.3;
  });
  const garbageRatio = nonEmptyLines.length > 0 ? garbageLines.length / nonEmptyLines.length : 0;

  const htmlFragments = (text.match(/<[a-zA-Z][^>]{0,50}>/g) || []).length;

  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 10);

  const arabicScore = Math.min(1, arabicRatio / 0.9) * 30;
  const headingScore = Math.min(1, headings / Math.max(1, Math.ceil(words.length / 500))) * 20;
  const garbagePenalty = garbageRatio * 20;
  const paragraphScore = paragraphs.length > 1 ? 15 : paragraphs.length === 1 ? 5 : 0;
  const sizeScore = words.length > 100 ? 15 : (words.length / 100) * 15;
  const qualityScore = Math.round(
    Math.max(
      0,
      Math.min(100, arabicScore + headingScore + paragraphScore + sizeScore - garbagePenalty),
    ),
  );

  return {
    pageCount:
      knownPageCount && knownPageCount > 0
        ? knownPageCount
        : Math.max(1, Math.ceil(words.length / 250)),
    headingCount: headings,
    level1HeadingCount: level1Headings,
    level2HeadingCount: level2Headings,
    level3HeadingCount: level3Headings,
    wordCount: words.length,
    charCount: text.length,
    arabicRatio: totalChars > 0 ? arabicChars / totalChars : 0,
    garbageRatio,
    htmlFragmentCount: htmlFragments,
    paragraphCount: paragraphs.length,
    qualityScore,
  };
}
