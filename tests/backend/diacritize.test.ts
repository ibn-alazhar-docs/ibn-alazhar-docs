import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const { mockRunPython } = vi.hoisted(() => ({ mockRunPython: vi.fn() }));

vi.mock("@ibn-al-azhar-docs/pipeline/utils/python-runner", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@ibn-al-azhar-docs/pipeline/utils/python-runner")>();
  return { ...actual, runPython: mockRunPython };
});

const DIACRITIZE_DIR = join(process.cwd(), "packages", "pipeline", "src", "text", "diacritize");

import {
  deterministicDiacritize,
  computeCoverage,
  resolveWord,
  toPauseForm,
} from "@ibn-al-azhar-docs/pipeline/text/diacritize/deterministic";
import {
  probePythonBackend,
  createPythonDiacritizer,
} from "@ibn-al-azhar-docs/pipeline/text/diacritize/python-backend";
import { DiacritizeError } from "@ibn-al-azhar-docs/pipeline/text/diacritize/types";
import {
  extractProtectedSpans,
  isHeavilyVocalized,
} from "@ibn-al-azhar-docs/pipeline/text/diacritize/protected-spans";

const SUKUN = "\u0652";

// Engine expectations are built from explicit code points (canonical
// [letter][shadda][vowel] order) so the assertions do not depend on how the
// editor/terminal ordered combining marks inside hand-typed Arabic literals.
const JALALA = "\u0627\u0644\u0644\u0651\u064e\u0647"; // اللَّه (pausal form = + SUKUN)
const JALALA_MARFU = JALALA + "\u064f"; // اللَّهُ (phrase-internal, raised)
const QALA = "\u0642\u064e\u0627\u0644\u064e"; // قَالَ
const INNA = "\u0625\u0650\u0646\u0651\u064e"; // إِنَّ
const FI = "\u0641\u0650\u064a"; // فِي
const ALKITAB = "\u0627\u0644\u0652\u0643\u0650\u062a\u064e\u0627\u0628"; // الْكِتَاب
const WALKITAB = "\u0648\u064e" + ALKITAB; // وَالْكِتَاب (waaw carries fatha)
const ALBAYT_PAUSE = "\u0627\u0644\u0652\u0628\u064e\u064a\u0652\u062a" + SUKUN; // الْبَيْتْ
const ALILM = "\u0627\u0644\u0652\u0639\u0650\u0644\u0652\u0645"; // الْعِلْم
const ALILM_PAUSE = ALILM + SUKUN; // الْعِلْمْ
const KITAB_CORE = "\u0643\u0650\u062a\u064e\u0627\u0628"; // كِتَاب
const KABIR_CORE = "\u0643\u064e\u0628\u0650\u064a\u0631"; // كَبِير
const JAZAKA = "\u062c\u064e\u0632\u064e\u0627\u0643\u064e"; // جَزَاكَ
const KHAYRAN = "\u062e\u064e\u064a\u0652\u0631\u064b\u0627"; // خَيْرًا
const LILLAH = "\u0644\u0650\u0644\u0651\u064e\u0647"; // لِلَّه (no alif: lam-preposition + jalala)
const EXPECT_BASEMALA =
  "\u0628\u0650\u0633\u0652\u0645\u0650 \u0627\u0644\u0644\u0651\u064e\u0647\u0650 \u0627\u0644\u0631\u0651\u064e\u062d\u0652\u0645\u064e\u0670\u0646\u0650 \u0627\u0644\u0631\u0651\u064e\u062d\u0650\u064a\u0645\u0652";
const EXPECT_SALAWAT =
  "\u0635\u064e\u0644\u0651\u064e\u0649 " +
  JALALA_MARFU +
  " \u0639\u064e\u0644\u064e\u064a\u0652\u0647\u0650 \u0648\u064e\u0633\u064e\u0644\u0651\u064e\u0645\u0652";
const EXPECT_HAMDALA =
  "\u0627\u0644\u0652\u062d\u064e\u0645\u0652\u062f\u064f \u0644\u0650\u0644\u0651\u064e\u0647\u0650 \u0631\u064e\u0628\u0651\u0650 \u0627\u0644\u0652\u0639\u064e\u0627\u0644\u064e\u0645\u0650\u064a\u0646\u0652";

/** Real Arabic prose paragraph used for the measured-coverage assertion. */
const REAL_PARAGRAPH =
  "إن اللغة العربية لغة دقيقة في نحوها وصرفها، وهي لغة العلم والأدب في حضارتنا الطويلة. " +
  "وقد قال العلماء إن طلب العلم يحتاج إلى صبر وأدب، كما يحتاج إلى معلم ماهر وكتاب جيد. " +
  "فالقارئ الذي يقرأ كل يوم صفحات من كتاب يزداد علما وفهما، أما الذي يترك القراءة فهو في خسران كبير.";

describe("deterministic engine — fixed formulae", () => {
  it("renders the basmala exactly", () => {
    const r = deterministicDiacritize("بسم الله الرحمن الرحيم");
    expect(r.engine).toBe("deterministic");
    expect(r.text).toBe(EXPECT_BASEMALA);
    expect(r.coverage).toBeGreaterThan(0.4);
  });

  it("renders the standard salawat formula (final word pausable)", () => {
    const r = deterministicDiacritize("صلى الله عليه وسلم");
    expect(r.text).toBe(EXPECT_SALAWAT);
  });

  it("renders الحمد لله رب العالمين with waqf on the last word", () => {
    const r = deterministicDiacritize("الحمد لله رب العالمين");
    expect(r.text).toBe(EXPECT_HAMDALA);
  });
});

describe("deterministic engine — definite article (شمسية / قمرية)", () => {
  it("puts the shadda on the sun letter and keeps the lam bare", () => {
    const resolved = resolveWord("الشمس");
    expect(resolved).not.toBeNull();
    expect(resolved!.diacritized).toBe("\u0627\u0644\u0634\u0651\u0645\u0652\u0633");
    // lam must NOT carry the sukun when followed by a sun letter
    expect(resolved!.diacritized).not.toContain("\u0644" + SUKUN);
  });

  it("keeps the lam with sukun before a moon letter", () => {
    const resolved = resolveWord("القمر");
    expect(resolved!.diacritized).toBe("\u0627\u0644\u0652\u0642\u064e\u0645\u064e\u0631");
  });

  it("handles hamzat al-wasl as a plain alif (never U+0671)", () => {
    const r = deterministicDiacritize("والكتاب في البيت");
    expect(r.text).not.toContain("\u0671");
    expect(r.text).toBe(WALKITAB + " " + FI + " " + ALBAYT_PAUSE);
  });

  it("derives prefixed clitics (بال / وال / لل) and the jalala", () => {
    expect(resolveWord("بالعلم")!.diacritized).toBe(
      "\u0628\u0650\u0627\u0644\u0652\u0639\u0650\u0644\u0652\u0645",
    );
    expect(resolveWord("والرحمن")!.diacritized).toBe(
      "\u0648\u064e\u0627\u0644\u0631\u0651\u062d\u0652\u0645\u064e\u0670\u0646",
    );
    expect(resolveWord("لله")!.diacritized).toBe(LILLAH);
    expect(resolveWord("بالله")!.diacritized).toBe("\u0628\u0650" + JALALA);
    expect(resolveWord("الله")!.diacritized).toBe(JALALA);
  });
});

describe("deterministic engine — protected spans & already-vocalized gate", () => {
  it("leaves fully vocalized text untouched with an explicit warning", () => {
    const input = "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ وَالصَّلَاةُ وَالسَّلَامُ عَلَى مُحَمَّدٍ";
    const r = deterministicDiacritize(input);
    expect(r.text).toBe(input);
    expect(r.warnings).toContain("ALREADY_VOCALIZED");
  });

  it("does not let one vocalized ayah freeze the rest of the document", () => {
    const ayah = "﴿وَالْعَصْرِ إِنَّ الْإِنْسَانَ لَفِي خُسْرٍ﴾";
    const input =
      "قال الله تعالى " + ayah + " ثم قال الكتاب في العلم والناس في اليوم الحاضر البابر";
    const r = deterministicDiacritize(input);
    expect(r.text).toContain(ayah); // protected span is byte-identical
    expect(r.text).toContain(QALA); // outside the span, processing happened
    expect(r.text).toContain(ALKITAB);
    expect(r.warnings).not.toContain("ALREADY_VOCALIZED");
    expect(r.warnings).toContain("PROTECTED_SPAN_PASSTHROUGH:1");
    // table-miss words are reported, not silently dropped
    expect(r.warnings.some((w) => w.startsWith("UNVOWELIZED_WORD:"))).toBe(true);
  });

  it("protects legal citations and vocalizes around them", () => {
    const legal = "المادة 15";
    const input = "راجع " + legal + " ثم اقرأ الكتاب في العلم";
    const spans = extractProtectedSpans(input);
    expect(spans.length).toBeGreaterThan(0);
    const [start, end] = spans[0];
    expect(input.slice(start, end)).toBe(legal);
    const r = deterministicDiacritize(input);
    expect(r.text).toContain(legal);
    expect(r.text).toContain(ALKITAB);
  });

  it("protects an inner-vocalized quoted span but processes outside text", () => {
    const quoted = "«الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ»";
    const input = "جاء في النص " + quoted + " ثم قال العلماء كلمة طويلة عن العلم والناس اليوم";
    const r = deterministicDiacritize(input);
    expect(r.text).toContain(quoted);
    expect(r.text).toContain(QALA);
    expect(r.warnings).not.toContain("ALREADY_VOCALIZED");
  });

  it("isHeavilyVocalized uses the ratio gate only", () => {
    expect(isHeavilyVocalized("الحمد لله رب العالمين الرحيم الكريم الشهيد")).toBe(false);
    expect(isHeavilyVocalized("الرَّحْمَٰنِ الرَّحِيمِ الْحَمْدُ لِلَّهِ")).toBe(true);
  });
});

describe("deterministic engine — conservative mode", () => {
  it("leaves unknown words untouched and records them", () => {
    const r = deterministicDiacritize("زقبقبون سنجابى");
    expect(r.text).toBe("زقبقبون سنجابى");
    expect(r.coverage).toBe(0);
    expect(r.warnings).toContain("UNVOWELIZED_COUNT:2");
    expect(r.warnings.some((w) => w.startsWith("UNVOWELIZED_WORD:"))).toBe(true);
  });

  it("never adds a random haraka to an unknown word", () => {
    const r = deterministicDiacritize("المركبوطة الزقبقونية");
    expect(r.text).toBe("المركبوطة الزقبقونية");
    expect(r.coverage).toBe(0);
  });

  it("warns on non-Arabic input instead of claiming success", () => {
    const r = deterministicDiacritize("hello world 123");
    expect(r.text).toBe("hello world 123");
    expect(r.coverage).toBe(0);
    expect(r.warnings).toContain("NON_ARABIC_PASSTHROUGH");
  });
});

describe("deterministic engine — tanwin and waqf (pause forms)", () => {
  it("keeps tanwin in fixed formulae at a pause, never corrupting it", () => {
    const r = deterministicDiacritize("جزاك الله خيرا.");
    expect(r.text).toBe(JAZAKA + " " + JALALA_MARFU + " " + KHAYRAN + ".");
  });

  it("applies pause sukun to bare final letters", () => {
    expect(toPauseForm(KITAB_CORE)).toBe(KITAB_CORE + SUKUN);
    expect(toPauseForm("\u0631\u064e\u062d\u0652\u0645\u064e\u0629")).toBe(
      "\u0631\u064e\u062d\u0652\u0645\u064e\u0629" + SUKUN,
    ); // taa marbuta takes sukun at waqf
    expect(toPauseForm("\u0639\u064e\u0627\u0644\u064e\u0645\u0650\u064a\u0646")).toBe(
      "\u0639\u064e\u0627\u0644\u064e\u0645\u0650\u064a\u0646" + SUKUN,
    ); // ya'-na pause
  });

  it("converts a fixed final vowel to sukun at waqf", () => {
    expect(toPauseForm("\u0643\u064e\u0627\u0646\u064e")).toBe("\u0643\u064e\u0627\u0646" + SUKUN);
    expect(toPauseForm("\u0639\u064e\u0627\u0644\u064e\u0645\u0650\u064a\u0646\u064e")).toBe(
      "\u0639\u064e\u0627\u0644\u064e\u0645\u0650\u064a\u0646" + SUKUN,
    );
    expect(toPauseForm("\u0627\u0644\u064e\u0651\u0630\u0650\u064a\u0646\u064e")).toBe(
      "\u0627\u0644\u064e\u0651\u0630\u0650\u064a\u0646" + SUKUN,
    );
  });

  it("leaves quiescent long vowels and shadda endings untouched", () => {
    expect(toPauseForm("\u062f\u064f\u0646\u0652\u064a\u064e\u0627")).toBe(
      "\u062f\u064f\u0646\u0652\u064a\u064e\u0627",
    );
    expect(toPauseForm("\u0633\u064f\u0631\u064f\u0651")).toBe("\u0633\u064f\u0631\u064f\u0651");
  });

  it("does not pause a word that continues the sentence", () => {
    const r = deterministicDiacritize("كتاب كبير في العلم");
    expect(r.text).toBe(KITAB_CORE + " " + KABIR_CORE + " " + FI + " " + ALILM_PAUSE);
  });

  it("pauses the last word of the text and of a sentence", () => {
    expect(deterministicDiacritize("كان. قال").text).toBe(
      "\u0643\u064e\u0627\u0646" + SUKUN + ". " + "\u0642\u064e\u0627\u0644" + SUKUN,
    );
  });
});

describe("coverage measurement", () => {
  it("computes letter-level coverage (harakat are not letters)", () => {
    expect(computeCoverage(KITAB_CORE)).toBe(0.5); // 2 of ك ت ا ب carry marks
    expect(computeCoverage("كتاب")).toBe(0);
    expect(computeCoverage("")).toBe(0);
  });

  it("measures conservative coverage on a real paragraph", () => {
    const r = deterministicDiacritize(REAL_PARAGRAPH);
    // Measured 2026-11-08 with the deterministic engine: ~0.25 on general
    // prose — honest for a table-driven engine that refuses to guess i'rab.
    expect(r.coverage).toBeGreaterThan(0.15);
    expect(r.coverage).toBeLessThan(0.55);
    // formulaic/high-frequency words inside the paragraph get vowelized
    expect(r.text).toContain(INNA);
    expect(r.text).toContain(QALA);
    expect(r.text).toContain(ALILM);
    // and unknown words must be reported, not silently dropped
    expect(r.warnings.some((w) => w.startsWith("UNVOWELIZED_COUNT:"))).toBe(true);
  });

  it("coverage is high on formula-dense religious text", () => {
    const r = deterministicDiacritize("بسم الله الرحمن الرحيم الحمد لله رب العالمين");
    expect(r.coverage).toBeGreaterThan(0.4);
  });
});

describe("input guards", () => {
  it("fails on empty input with a code", async () => {
    expect(() => deterministicDiacritize("   ")).toThrow(DiacritizeError);
    try {
      deterministicDiacritize("   ");
    } catch (err) {
      expect(err).toBeInstanceOf(DiacritizeError);
      expect((err as DiacritizeError).code).toBe("INPUT_EMPTY");
    }
  });

  it("enforces a max input size at the facade", async () => {
    const { diacritizeText } = await import("@ibn-al-azhar-docs/pipeline/text/diacritize");
    await expect(diacritizeText("كلمة", { maxInputChars: 2 })).rejects.toMatchObject({
      code: "INPUT_TOO_LARGE",
    });
  });
});

describe("python backend adapter (mocked runner)", () => {
  beforeEach(() => {
    mockRunPython.mockReset();
  });

  it("reports unavailable when camel_tools/CAMBRT cannot load", async () => {
    mockRunPython.mockRejectedValue(
      new Error("ModuleNotFoundError: No module named 'camel_tools'"),
    );
    const probe = await probePythonBackend();
    expect(probe.available).toBe(false);
  });

  it("createPythonDiacritizer fails with ENGINE_UNAVAILABLE instead of passthrough", async () => {
    mockRunPython.mockRejectedValue(new Error("python3: not found"));
    await expect(createPythonDiacritizer()).rejects.toMatchObject({
      name: "DiacritizeError",
      code: "ENGINE_UNAVAILABLE",
    });
  });

  it("returns the real backend output when available", async () => {
    mockRunPython.mockImplementation(async ({ args }: { args: string[] }) => {
      if (args.includes("--probe")) {
        return {
          stdout: JSON.stringify({ available: true, camelMle: true, cambrt: false, detail: "" }),
          stderr: "",
          tempDir: "/tmp/t",
        };
      }
      const inputPath = args[args.length - 1];
      const data = JSON.parse(readFileSync(inputPath, "utf-8")) as { texts: string[] };
      return {
        stdout: JSON.stringify({
          engine: "camel-mle",
          results: data.texts.map((t) => "مُشَكَّلٌ " + t),
        }),
        stderr: "",
        tempDir: "/tmp/t",
      };
    });

    const probe = await probePythonBackend();
    expect(probe.available).toBe(true);
    const engine = await createPythonDiacritizer(probe);
    const r = await engine.diacritize("كتاب");
    expect(r.engine).toBe("python-camel");
    expect(r.text).toBe("مُشَكَّلٌ كتاب");
    expect(r.coverage).toBeGreaterThan(0);
  });

  it("maps a script-level error to ENGINE_FAILED (never silent input echo)", async () => {
    mockRunPython.mockImplementation(async ({ args }: { args: string[] }) => {
      if (args.includes("--probe")) {
        return {
          stdout: JSON.stringify({ available: true, camelMle: true, cambrt: false }),
          stderr: "",
          tempDir: "/tmp/t",
        };
      }
      return {
        stdout: JSON.stringify({ error: "model download failed" }),
        stderr: "",
        tempDir: "/tmp/t",
      };
    });
    const probe = await probePythonBackend();
    const engine = await createPythonDiacritizer(probe);
    await expect(engine.diacritize("كلام")).rejects.toMatchObject({ code: "ENGINE_FAILED" });
  });

  it("maps empty backend results to ENGINE_FAILED", async () => {
    mockRunPython.mockImplementation(async ({ args }: { args: string[] }) => {
      if (args.includes("--probe")) {
        return {
          stdout: JSON.stringify({ available: true, camelMle: true, cambrt: false }),
          stderr: "",
          tempDir: "/tmp/t",
        };
      }
      return {
        stdout: JSON.stringify({ engine: "camel-mle", results: ["   "] }),
        stderr: "",
        tempDir: "/tmp/t",
      };
    });
    const probe = await probePythonBackend();
    const engine = await createPythonDiacritizer(probe);
    await expect(engine.diacritize("كلام")).rejects.toMatchObject({ code: "ENGINE_FAILED" });
  });

  it("facade: engine=python with no backend rejects instead of faking success", async () => {
    vi.resetModules();
    mockRunPython.mockRejectedValue(new Error("unavailable"));
    const { diacritizeText } = await import("@ibn-al-azhar-docs/pipeline/text/diacritize");
    await expect(diacritizeText("كتاب", { engine: "python" })).rejects.toMatchObject({
      code: "ENGINE_UNAVAILABLE",
    });
  });

  it("facade: auto falls back to the deterministic engine when python is missing", async () => {
    vi.resetModules();
    mockRunPython.mockRejectedValue(new Error("unavailable"));
    const { diacritizeText, isDiacritizerAvailable } = await import(
      "@ibn-al-azhar-docs/pipeline/text/diacritize"
    );
    expect(await isDiacritizerAvailable("python")).toBe(false);
    expect(await isDiacritizerAvailable()).toBe(true);
    const r = await diacritizeText("كتاب الله");
    expect(r.engine).toBe("deterministic");
    expect(r.text).toContain(JALALA);
  });
});

describe("workers safety — no node builtins at module scope", () => {
  const files = [
    "index.ts",
    "types.ts",
    "lexicon.ts",
    "protected-spans.ts",
    "deterministic.ts",
    "python-backend.ts",
  ];

  it("contains no static node: imports", () => {
    for (const file of files) {
      const src = readFileSync(join(DIACRITIZE_DIR, file), "utf-8");
      const staticNodeImport = /^\s*import\s+(?!type)[^;]*from\s+"node:/gm;
      expect(src, file).not.toMatch(staticNodeImport);
      expect(src, file).not.toMatch(/execFile|spawnSync|\brequire\(/);
    }
  });

  it("confines node builtins to lazy await import() in the python adapter", () => {
    const src = readFileSync(join(DIACRITIZE_DIR, "python-backend.ts"), "utf-8");
    const lazy = /await import\("node:/g;
    expect(src.match(lazy)?.length ?? 0).toBeGreaterThan(0);
  });
});
