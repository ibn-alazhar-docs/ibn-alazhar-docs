/**
 * توفّر محرّك تصيير الـ PDF النصي لوحدة الاختبارات: WeasyPrint يجب أن يكون قابلًا
 * للاستيراد بنفس مفسّر Python الذي تستخدمه الطبقة نفسها (`getWeasyprintPython`)،
 * وPyMuPDF لقراءة المخرج وقياسه. بلاهما تُتخطّى قياسات المخرج الحقيقي ولا تفشل.
 */
import { execFileSync } from "node:child_process";
import { getWeasyprintPython } from "@ibn-al-azhar-docs/pipeline/output/pdf";

export const PDF_PYTHON = getWeasyprintPython();

function canImport(module: string): boolean {
  try {
    execFileSync(PDF_PYTHON, ["-c", `import ${module}`], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export const HAS_WEASYPRINT = canImport("weasyprint");
export const HAS_FITZ = canImport("fitz");

/** القياس على المخرج الفعلي يحتاج المحرّك والقارئ معًا. */
export const HAS_PDF_ENGINE = HAS_WEASYPRINT && HAS_FITZ;
