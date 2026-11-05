import { describe, it, expect } from "vitest";
import {
  evaluateQaGates,
  mdMetrics,
  tableProblems,
  lamSwapRate,
  countPagedBlocks,
  sevenStageToQaChecks,
  evaluateQaGatesWithSevenStage,
} from "@ibn-al-azhar-docs/pipeline";
import { runSevenStageAudit } from "@ibn-al-azhar-docs/pipeline/text";

const goodMd = [
  "# عنوان الكتاب",
  "",
  "الحمد لله رب العالمين والصلاة والسلام على رسول الله صلى الله عليه وسلم وعلى آله وصحبه أجمعين أما بعد فإن هذا كتاب في الفقه المقارن",
  "",
  "## الفصل الأول",
  "",
  "بدأ المؤلف بتعريف الفقه لغة واصطلاحا ثم ذكر أدلته وأقسامه ومسائله بالتفصيل الوافي الذي يليق بمقام العلم الشرعي الرفيع",
].join("\n");

describe("mdMetrics", () => {
  it("counts headings, chars and arabic ratio", () => {
    const m = mdMetrics(goodMd);
    expect(m.headings).toBe(2);
    expect(m.chars).toBe(goodMd.length);
    expect(m.arabicRatio).toBeGreaterThan(0.5);
    expect(m.pagebreakLeak).toBe(false);
    expect(m.camscanner).toBe(false);
  });

  it("detects CamScanner and pagebreak leaks", () => {
    expect(mdMetrics("CamScanner output").camscanner).toBe(true);
    expect(mdMetrics("--PAGE_BREAK-->").pagebreakLeak).toBe(true);
  });
});

describe("tableProblems / lamSwapRate / countPagedBlocks", () => {
  it("flags uneven markdown tables", () => {
    expect(tableProblems("| أ | ب |\n| 1 | 2 | 3 |")).toHaveLength(1);
    expect(tableProblems("| أ | ب |\n| 1 | 2 |")).toHaveLength(0);
  });

  it("returns null lamSwapRate for short text", () => {
    expect(lamSwapRate("نص قصير")).toBeNull();
  });

  it("counts paged blocks over 40 chars", () => {
    const raw = ["x".repeat(50), "short", "y".repeat(60)].join("---PAGEBREAK---");
    expect(countPagedBlocks(raw)).toBe(2);
  });
});

describe("evaluateQaGates", () => {
  it("passes a well-formed book md with enough pages", () => {
    const r = evaluateQaGates({
      md: goodMd,
      inputPages: 10,
      outputPages: 10,
      cleanReport: { pages: 10, chars_per_page: 300 },
    });
    expect(r.pass).toBe(true);
    expect(r.exitCode).toBe(0);
    expect(r.checks.length).toBeGreaterThan(5);
  });

  it("fails when output pages are far below input pages", () => {
    const r = evaluateQaGates({ md: goodMd, inputPages: 100, outputPages: 10 });
    expect(r.pass).toBe(false);
    expect(r.exitCode).toBe(1);
  });

  it("warnings never fail the build (visual book)", () => {
    const r = evaluateQaGates({
      md: goodMd,
      inputPages: 10,
      outputPages: 10,
      options: { visual: true },
    });
    expect(r.pass).toBe(true);
  });
});

describe("seven-stage integration with qa-gates", () => {
  it("sevenStageToQaChecks maps 7 stages to checks", () => {
    const report = runSevenStageAudit(goodMd);
    const checks = sevenStageToQaChecks(report);
    expect(checks).toHaveLength(7);
    expect(checks.every((c) => c.name.startsWith("seven-stage-"))).toBe(true);
  });

  it("evaluateQaGatesWithSevenStage combines both verdicts", () => {
    const report = runSevenStageAudit(goodMd);
    const combined = evaluateQaGatesWithSevenStage(
      { md: goodMd, inputPages: 10, outputPages: 10, cleanReport: { pages: 10, chars_per_page: 300 } },
      report,
    );
    expect(combined.pass).toBe(true);
    expect(combined.qa.pass).toBe(true);
  });

  it("combined verdict fails when seven-stage fails even if qa passes", () => {
    const bad = runSevenStageAudit("قال تعالى ﴿نص محرف لا أصل له في المصحف إطلاقا أبدا﴾");
    const combined = evaluateQaGatesWithSevenStage(
      { md: goodMd, inputPages: 10, outputPages: 10 },
      bad,
    );
    expect(combined.pass).toBe(false);
  });
});
