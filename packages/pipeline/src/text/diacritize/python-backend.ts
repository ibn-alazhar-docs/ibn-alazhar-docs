import type { DiacritizeResult, Diacritizer } from "./types";
import { DiacritizeError } from "./types";
import { computeCoverage } from "./deterministic";

/**
 * Python backend adapter for real statistical diacritization
 * (camel_tools MLE disambiguator, with CAMBRT-Tashkeel as a secondary
 * probe). It is used ONLY when an explicit availability probe succeeds.
 *
 * Honesty contract: if the backend cannot run, this module throws a coded
 * `DiacritizeError` — it never returns the input text as a fake success.
 * `runPython` (and its node:child_process import) is loaded lazily inside
 * functions so this file stays inert in a cloudflare-workers bundle until
 * someone actually asks for the Python engine; on workers the import throws
 * and the probe honestly reports "unavailable".
 */

export interface PythonBackendProbe {
  available: boolean;
  camelMle: boolean;
  cambrt: boolean;
  detail?: string;
}

/**
 * Self-contained Python source executed with `python -c`. Deliberately
 * avoids f-strings so the `${...}` template interpolation in this TS file
 * is unambiguous. Protocol mirrors the historical diacritics.py contract
 * ({"texts": [...]} -> {"results": [...]}), extended with "engine".
 */
const PYTHON_BACKEND_SOURCE = `
import sys, json

def probe():
    out = {"camelMle": False, "cambrt": False, "detail": ""}
    try:
        from camel_tools.tokenizers.word import simple_word_tokenize  # noqa: F401
        from camel_tools.disambig.mle import MLEDisambiguator
        MLEDisambiguator.pretrained()
        out["camelMle"] = True
    except Exception as exc:
        out["detail"] = "camel_mle: " + str(exc)[:300]
    try:
        import cambrt
        out["cambrt"] = any(hasattr(cambrt, name) for name in ("CAMBRT", "dbrt", "tashkeel"))
    except Exception as exc:
        out["detail"] += " | cambrt: " + str(exc)[:300]
    out["available"] = out["camelMle"] or out["cambrt"]
    print(json.dumps(out))

def camel_run(texts):
    from camel_tools.tokenizers.word import simple_word_tokenize
    from camel_tools.disambig.mle import MLEDisambiguator

    mle = MLEDisambiguator.pretrained()
    results = []
    for text in texts:
        tokens = simple_word_tokenize(text.split())
        disambigs = mle.prefer_disambiguate(tokens, simplify=True)
        results.append(" ".join(str(d.get("word", t)) for d, t in zip(disambigs, tokens)))
    return "camel-mle", results

def cambrt_run(texts):
    import cambrt

    engine_name = "cambrt"
    results = []
    if hasattr(cambrt, "CAMBRT"):
        engine = cambrt.CAMBRT()
        for text in texts:
            results.append(str(engine.diacritize(text)))
    elif hasattr(cambrt, "dbrt"):
        for text in texts:
            results.append(str(cambrt.dbrt(text)))
    else:
        raise RuntimeError("cambrt API not recognized")
    return engine_name, results

def run(path):
    with open(path, "r", encoding="utf-8") as fh:
        texts = json.load(fh).get("texts", [])
    try:
        engine, results = camel_run(texts)
    except ImportError:
        engine, results = cambrt_run(texts)
    print(json.dumps({"engine": engine, "results": results}, ensure_ascii=False))

if len(sys.argv) < 2 or sys.argv[1] == "--probe":
    probe()
elif sys.argv[1] == "--run":
    if len(sys.argv) < 3:
        print(json.dumps({"error": "missing input file"}))
        sys.exit(1)
    run(sys.argv[2])
else:
    print(json.dumps({"error": "unknown mode"}))
    sys.exit(1)
`;

function parseProbeJson(stdout: string): PythonBackendProbe {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    throw new DiacritizeError("ENGINE_FAILED", "مخرجات فحص بايثون غير قابلة للقراءة", {
      cause: stdout.slice(0, 200),
    });
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new DiacritizeError("ENGINE_FAILED", "مخرجات فحص بايثون غير صالحة");
  }
  const record = parsed as Record<string, unknown>;
  const camelMle = record.camelMle === true;
  const cambrt = record.cambrt === true;
  return {
    available: record.available === true && (camelMle || cambrt),
    camelMle,
    cambrt,
    detail: typeof record.detail === "string" ? record.detail : undefined,
  };
}

/**
 * Probe the Python environment. Never throws for "not installed / not
 * reachable" — that is reported as `available: false`. Throws
 * DiacritizeError only when the runner machinery itself is broken.
 */
export async function probePythonBackend(timeoutMs: number = 20_000): Promise<PythonBackendProbe> {
  let runPython: typeof import("../../utils/python-runner").runPython;
  try {
    ({ runPython } = await import("../../utils/python-runner"));
  } catch (err) {
    // cloudflare-workers and other environments without node:child_process.
    return {
      available: false,
      camelMle: false,
      cambrt: false,
      detail: "python-runner unavailable: " + String((err as Error)?.message ?? err),
    };
  }

  try {
    const result = await runPython({
      args: ["-c", PYTHON_BACKEND_SOURCE, "--probe"],
      timeout: timeoutMs,
    });
    return parseProbeJson(result.stdout);
  } catch (err) {
    return {
      available: false,
      camelMle: false,
      cambrt: false,
      detail: String((err as Error)?.message ?? err).slice(0, 300),
    };
  }
}

interface PythonRunResponse {
  engine: string;
  results: string[];
}

function parseRunResponse(stdout: string): PythonRunResponse {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    throw new DiacritizeError("ENGINE_FAILED", "استجابة بايثون غير قابلة للقراءة", {
      cause: stdout.slice(0, 200),
    });
  }
  const record: unknown = parsed;
  if (typeof record !== "object" || record === null) {
    throw new DiacritizeError("ENGINE_FAILED", "استجابة بايثون غير صالحة");
  }
  const candidate = record as Record<string, unknown>;
  if (typeof candidate.error === "string") {
    throw new DiacritizeError("ENGINE_FAILED", `DIACRITICS_SCRIPT_ERROR: ${candidate.error}`);
  }
  if (
    typeof candidate.engine !== "string" ||
    !Array.isArray(candidate.results) ||
    candidate.results.some((item) => typeof item !== "string")
  ) {
    throw new DiacritizeError("ENGINE_FAILED", "استجابة بايثون تفتقر إلى engine/results");
  }
  return { engine: candidate.engine, results: candidate.results as string[] };
}

async function runPythonBatch(
  texts: string[],
  timeoutMs: number,
): Promise<{ response: PythonRunResponse; warnings: string[] }> {
  let runPython: typeof import("../../utils/python-runner").runPython;
  let mkdtemp: typeof import("node:fs/promises").mkdtemp;
  let writeFile: typeof import("node:fs/promises").writeFile;
  let rm: typeof import("node:fs/promises").rm;
  let join: typeof import("node:path").join;
  let tmpdir: typeof import("node:os").tmpdir;
  try {
    ({ runPython } = await import("../../utils/python-runner"));
    ({ mkdtemp, writeFile, rm } = await import("node:fs/promises"));
    ({ join } = await import("node:path"));
    ({ tmpdir } = await import("node:os"));
  } catch (err) {
    throw new DiacritizeError(
      "ENGINE_UNAVAILABLE",
      "بيئة التشغيل لا تسمح بتشغيل Python (node:child_process غير متاح)",
      { cause: String((err as Error)?.message ?? err) },
    );
  }

  const tempDir = await mkdtemp(join(tmpdir(), "diacritize-py-"));
  try {
    const inputPath = join(tempDir, "input.json");
    await writeFile(inputPath, JSON.stringify({ texts }), "utf-8");

    const result = await runPython({
      args: ["-c", PYTHON_BACKEND_SOURCE, "--run", inputPath],
      timeout: timeoutMs,
      cwd: tempDir,
    });
    return { response: parseRunResponse(result.stdout), warnings: [] };
  } catch (err) {
    if (err instanceof DiacritizeError) throw err;
    const message = String((err as Error)?.message ?? err);
    if (/timed out|ETIMEDOUT/i.test(message)) {
      throw new DiacritizeError("ENGINE_TIMEOUT", "انتهت مهلة محرك التشكيل", { cause: message });
    }
    throw new DiacritizeError("ENGINE_FAILED", "فشل محرك التشكيل", {
      cause: message.slice(0, 400),
    });
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Build a Diacritizer backed by camel_tools/CAMBRT. Throws
 * DiacritizeError("ENGINE_UNAVAILABLE") when the probe fails — callers map
 * that to HTTP 503 instead of serving a simulated result.
 */
export async function createPythonDiacritizer(probe?: PythonBackendProbe): Promise<Diacritizer> {
  const status = probe ?? (await probePythonBackend());
  if (!status.available) {
    throw new DiacritizeError(
      "ENGINE_UNAVAILABLE",
      "محرك Python للتشكيل غير متاح (camel_tools/CAMBRT غير مثبت أو غير مستجيب)",
      { cause: status.detail },
    );
  }

  return {
    id: "python-camel",
    async diacritize(text: string): Promise<DiacritizeResult> {
      const { response, warnings } = await runPythonBatch([text], 120_000);
      const out = response.results[0];
      if (typeof out !== "string") {
        throw new DiacritizeError("ENGINE_FAILED", "لم يُرجع محرك Python أي نتيجة");
      }
      if (out.trim() === "" && text.trim() !== "") {
        throw new DiacritizeError("ENGINE_FAILED", "أرجع محرك Python نصًا فارغًا");
      }
      const engine = response.engine === "cambrt" ? "python-cambrt" : "python-camel";
      return {
        text: out,
        coverage: computeCoverage(out),
        engine,
        warnings,
      };
    },
  };
}
