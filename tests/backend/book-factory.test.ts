import { describe, it, expect } from "vitest";
import {
  SequenceMatcher,
  normalizeLetters,
  wordKeys,
  QuranIndex,
  HadithIndex,
  QuoteChecker,
  type QuranCorpus,
} from "../../packages/pipeline/src/verify-quotes";
import { explode, splitNumbered, isMainQuestion, parseBooklet } from "../../packages/pipeline/src/booklet";
import { cleanStructureText } from "../../packages/pipeline/src/clean-structure";
import { evaluateQaGates, mdMetrics } from "../../packages/pipeline/src/qa-gates";
import { runBookFactory } from "../../packages/pipeline/src/book-factory";
import { generateDocx } from "../../packages/pipeline/src/output/pandoc";
import { embedAmiriFonts, readZip, readDocxDocumentXml, countOmml } from "../../packages/pipeline/src/output/embed-fonts";

const CORPUS: QuranCorpus = {
  data: {
    surahs: [
      {
        number: 1,
        name: "سُورَةُ الفَاتِحَةِ",
        ayahs: [
          { numberInSurah: 1, text: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ" },
          { numberInSurah: 2, text: "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ" },
        ],
      },
      {
        number: 112,
        name: "سُورَةُ الإِخْلَاصِ",
        ayahs: [
          { numberInSurah: 1, text: "قُلْ هُوَ اللَّهُ أَحَدٌ" },
          { numberInSurah: 2, text: "اللَّهُ الصَّمَدُ" },
        ],
      },
    ],
  },
};

describe("SequenceMatcher (difflib port)", () => {
  it("ratio identical = 1, disjoint = 0", () => {
    expect(new SequenceMatcher(["a", "b"], ["a", "b"], { autojunk: false }).ratio()).toBe(1);
    expect(new SequenceMatcher(["a"], ["z"], { autojunk: false }).ratio()).toBe(0);
  });
  it("matches Python: 'abcd' vs 'abce' ratio 0.75", () => {
    // Python: SequenceMatcher(None,'abcd','abce').ratio() == 0.75
    expect(new SequenceMatcher("abcd".split(""), "abce".split(""), { autojunk: false }).ratio()).toBe(0.75);
  });
  it("matching blocks + opcodes", () => {
    const sm = new SequenceMatcher(["a", "b", "c"], ["a", "x", "c"], { autojunk: false });
    const blocks = sm.getMatchingBlocks();
    expect(blocks[blocks.length - 1]).toEqual({ a: 3, b: 3, size: 0 });
    const ops = sm.getOpcodes();
    expect(ops.some((o) => o.tag === "replace")).toBe(true);
  });
});

describe("normalize عربي", () => {
  it("hamza unified", () => {
    expect(normalizeLetters("أَحَد")).toBe(normalizeLetters("احد"));
  });
  it("numeric tokens dropped", () => {
    expect(wordKeys("قُلْ (١) هُوَ")).toEqual(["قل", "هو"]);
  });
});

describe("Quran index + checker", () => {
  it("resolve + exact span", () => {
    const q = new QuranIndex(CORPUS);
    expect(q.resolve("الإخلاص")).toBe(112);
    const { coverage } = q.span(112, 1, wordKeys("قُلْ هُوَ اللَّهُ أَحَدٌ"));
    expect(coverage).toBe(1);
  });
  it("correct verse clean, wrong letter Q001, wrong tashkeel Q002, braces T001", () => {
    const run = (body: string) => {
      const chk = new QuoteChecker(new QuranIndex(CORPUS), null, false);
      chk.checkText("x.md", body);
      return chk.findings.map((f) => f.code);
    };
    expect(run("- ﴿قُلْ هُوَ اللَّهُ أَحَدٌ﴾ [الإخلاص: 1]\n")).not.toContain("Q001");
    expect(run("- ﴿قُلْ هُوَ اللَّهُ أَحْمَدُ﴾ [الإخلاص: 1]\n")).toContain("Q001");
    expect(run("- ﴿قُلْ هُوَ اللَّهُ أَحَدُ﴾ [الإخلاص: 1]\n")).toContain("Q002");
    expect(run("- {قُلْ هُوَ اللَّهُ أَحَدٌ}\n")).toContain("T001");
  });
  it("hadith H001 for unknown, H002 for mismatched", () => {
    const text =
      "إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى فَمَنْ كَانَتْ هِجْرَتُهُ إِلَى اللَّهِ وَرَسُولِهِ";
    const hadith = new HadithIndex([{ book: "البخاري", number: 1, text }]);
    // نصّ مخالف في كلمة واحدة وسط التغطية العالية ⇒ H002
    const chk = new QuoteChecker(new QuranIndex(CORPUS), hadith, false);
    chk.checkText("x.md", "قال: «إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ وَإِنَّمَا لِكُلِّ امْرِئٍ مَا قَصَدَ فَمَنْ كَانَتْ هِجْرَتُهُ إِلَى اللَّهِ وَرَسُولِهِ»\n");
    expect(chk.findings.some((f) => f.code === "H002")).toBe(true);
    // حديث مجهول تمامًا ⇒ H001
    const chk2 = new QuoteChecker(new QuranIndex(CORPUS), hadith, false);
    chk2.checkText("x.md", "قال: «مَنْ غَشَّنَا فَلَيْسَ مِنَّا وَالْمَكْرُ وَالْخَدَاعُ فِي النَّارِ يَوْمَ الْقِيَامَةِ»\n");
    expect(chk2.findings.some((f) => f.code === "H001")).toBe(true);
  });
});

describe("explode()", () => {
  it("dash-before-digit (Egyptian books)", () => {
    const out = explode("-١ ﴿قُلْ هُوَ اللَّهُ أَحَدٌ﴾ [الإخلاص: 1]. -٢ ﴿قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ﴾ [الفلق: 1].");
    expect(out).toHaveLength(2);
    expect(out[0]!.startsWith("١- ")).toBe(true);
    expect(out[1]!.startsWith("٢- ")).toBe(true);
  });
  it("digit-before-dash", () => {
    const out = explode("1- جائز 2- واجب 3- كثير 4- ممتنع.");
    expect(out).toHaveLength(4);
  });
  it("spaced dash options (OCR)", () => {
    const out = explode("1 - كُن للقرآن الكريم تاليًا. 2 - اعتَنِ بالسنة النبوية. 3 - تأمل من الشعر نصًا. 4 - كَتَبَ التاريخ بطولات.");
    expect(out).toHaveLength(4);
  });
  it("letters/single untouched", () => {
    expect(explode("(أ) الآية المشتملة على كلمتين، قوله تعالى:")).toHaveLength(1);
    expect(explode("٢- ضع علامة (✓) أمام العبارة الصحيحة.")).toHaveLength(1);
  });
});

describe("booklet hierarchy (س2:)", () => {
  it("numbered items under س label are not mains", () => {
    const md =
      "# بوكليت تجريبي\n\n## 1. الدرس 1\n\nس١: أجب عن الأسئلة الآتية:\n١- عرّف الحقيقة اللغوية.\n٢- اذكر شروط النقل.\nس٢: بين المجاز فيما يلي:\n١- قوله تعالى: ﴿آية﴾.\n١٠- قول الشاعر:\nبيت شعر هنا.\n";
    const parsed = parseBooklet(md);
    const mains = parsed.blocks.filter((b) => b.kind === "main");
    expect(mains).toHaveLength(2);
    const items = parsed.blocks.filter((b) => b.kind === "item");
    expect(items.some((b) => b.text.includes("عرّف الحقيقة"))).toBe(true);
    expect(items.some((b) => b.text.includes("قول الشاعر"))).toBe(true);
  });
  it("splitNumbered / isMainQuestion", () => {
    expect(splitNumbered("1- تخير الإجابة")!.num).toBe("1");
    expect(splitNumbered("-3 عَلِّل لما يأتي:")!.num).toBe("3");
    expect(isMainQuestion("تخير الإجابة الصحيحة مما يأتي:")).toBe(true);
    expect(isMainQuestion("﴿قُلْ هُوَ اللَّهُ أَحَدٌ﴾")).toBe(false);
  });
});

describe("cleanStructure", () => {
  it("S4 duplicate consecutive + S5 lone ** (كما في الأصل: ** مفرد يُحسب S5)", () => {
    const { md, stats } = cleanStructureText("سطر مكرر\nسطر مكرر\n**\nنص");
    expect(stats.S4).toBe(1);
    expect(stats.S5).toBe(1);
    expect(md).not.toContain("**");
  });
});

describe("QA gates reflow + new checks", () => {
  it("reflow passes page-ratio regardless of page count", () => {
    const md = "# عنوان\n\n" + "نص عربي طويل ".repeat(200) + "\n\n---PAGEBREAK---\n\n" + "نص آخر طويل جدا ".repeat(200);
    const r = evaluateQaGates({
      md,
      inputPages: 100,
      outputPages: 2,
      raw: md,
      options: { reflow: true },
    });
    const pr = r.checks.find((c) => c.name === "page-ratio")!;
    expect(pr.ok).toBe(true);
  });
  it("punct/hamza/heading-jump metrics", () => {
    const m = mdMetrics("## عنوان\n\n#### قفزة\n\nكلمة ، وكلمة\n\nاي كلمة");
    expect(m.headingJumps).toBe(1);
    expect(m.hamzaIssues).toBeGreaterThan(0);
    expect(m.punctIssues).toBeGreaterThan(0);
  });
  it("warn checks do not fail the gate", () => {
    const md = "## عنوان\n\n#### قفزة مستوى\n\n" + "نص عربي كافٍ لاجتياز حد الحروف ".repeat(30);
    const r = evaluateQaGates({ md, inputPages: 1, outputPages: 1, raw: md });
    const hj = r.checks.find((c) => c.name === "heading-levels")!;
    expect(hj.ok).toBe(false);
    expect(hj.warn).toBe(true);
  });
});

describe("book factory (skipBuild)", () => {
  it("wires structure + verify + QA", async () => {
    const md = "# كتاب\n\n- ﴿قُلْ هُوَ اللَّهُ أَحْمَدُ﴾ [الإخلاص: 1]\n\n" + "فقرة عربية طويلة كافية ".repeat(40);
    const res = await runBookFactory(
      { md, inputPages: 1, outputPages: 1 },
      { skipBuild: true, quranCorpus: CORPUS },
    );
    expect(res.findings.some((f) => f.code === "Q001")).toBe(true);
    expect(res.quoteExitCode).toBe(1);
    expect(res.pass).toBe(false);
    expect(res.qa.checks.length).toBeGreaterThan(5);
  });
});

describe("OMML via pandoc + embed Amiri", () => {
  it("pandoc math produces <m:oMath>", async () => {
    const md = "# رياضيات\n\n$س^2 + 1$\n";
    const buf = await generateDocx({ markdown: md }, { math: "pandoc" });
    const xml = readDocxDocumentXml(buf);
    expect(xml).toContain("<m:oMath");
    expect(countOmml(xml)).toBeGreaterThan(0);
  }, 30000);
  it("embedAmiri adds word/fonts/font1.odttf and fontTable", async () => {
    const buf = await generateDocx({ markdown: "# عنوان عربي\n\nنص عربي للاختبار مع فقرات كافية للبناء الصحيح هنا." }, {});
    const embedded = embedAmiriFonts(buf);
    const names = readZip(embedded).map((e) => e.name);
    expect(names).toContain("word/fonts/font1.odttf");
    expect(names).toContain("word/fontTable.xml");
    const ft = readZip(embedded).find((e) => e.name === "word/fontTable.xml")!.data.toString("utf8");
    expect(ft).toContain("embedRegular");
    // الناتج ZIP صالح يعيد قراءته
    expect(readDocxDocumentXml(embedded)).toContain("<w:document");
  }, 30000);
});
