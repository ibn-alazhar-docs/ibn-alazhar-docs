import {
  runPageGeometryScript,
  uploadBuffer,
  type PipelineConfig,
} from "@ibn-al-azhar-docs/pipeline";
import { logger } from "@ibn-al-azhar-docs/shared";

/**
 * geometry.ts — قياسُ هندسةِ صفحات الأصل مرةً واحدة عند التقسيم، وتخزينُها مع بقية
 * artifacts المرحلة.
 *
 * لماذا هنا: ملفُ الأصل يكون في الذاكرة فعلًا في `split.ts` لكلَي المسارين (native و
 * OCR)، فلا تكلفةَ قراءةٍ إضافية ولا حاجةَ إلى عمودٍ في القاعدة — `documentIR`/
 * `irVersion` عمودان ميتان لا يكتبهما إنتاجٌ، والبناءُ عليهما بناءٌ على رمل. الملفُ
 * الصغير يُقرأ عند التصدير وحده، فيبقى PDF وDOCX وEPUB على مصدرِ ورقةٍ واحد.
 *
 * لا يُقاس لغير الـ PDF: صورةٌ واحدة مقاسُها مقاسُ الصفحة، لا كتابَ فيه ورقةٌ وهوامش.
 *
 * الفشلُ لا يُسقط المهمة: القياسُ تحسينٌ للمُنتَج لا شرطُ نجاحٍ للمرحلة — من لا قياس
 * له يُصدَّر A4/٢سم كما كان قبل هذه الطبقة، ويُعلَن ذلك في اللوج لا يُدفن.
 */

/** مفتاحُ artifact الهندسة: يقرؤه عاملُ التصدير بنفس الصيغة لكل صيغةٍ تحتاج ورقةً. */
export function pageGeometryKey(config: PipelineConfig, jobId: string): string {
  return `${config.paths.ocrResults}/${jobId}/geometry.json`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * يقيس ويكتب `geometry.json` في التخزين. يُرجع true عند الكتابة، وfalse عند أيِّ
 * تخطٍّ (لا قياس، stdout غيرُ مقروء، فشلُ رفع) — بلا استثناءٍ يخرج إلى المرحلة.
 */
export async function writePageGeometry(
  fileBuffer: Buffer,
  jobId: string,
  config: PipelineConfig,
): Promise<boolean> {
  try {
    const stdout = await runPageGeometryScript(fileBuffer);
    if (stdout === null) return false;

    const parsed: unknown = JSON.parse(stdout);
    if (!isPlainObject(parsed)) {
      logger.warn({ jobId }, "[split] geometry payload is not an object — skipping");
      return false;
    }

    // وسمُ المصدر لا يُختلق: هذا القياسُ من PDF، ولو جاء مستقبلًا من EPUB أو DOCX
    // فليكن معلومًا أيُّ أصلٍ قيس، لأن أمانةَ المُنتَج تُنسَب إلى أصلٍ بعينه.
    // الباقي كما طبعه السكربت: لا يُعاد تأليفُ ما قيس، وإلا صار الأثرُ نسخةً ثانية.
    const payload = JSON.stringify({ source: "pdf", ...parsed });
    await uploadBuffer(
      config,
      pageGeometryKey(config, jobId),
      Buffer.from(payload, "utf-8"),
      "application/json",
    );
    logger.info({ jobId }, "[split] Stored page geometry artifact");
    return true;
  } catch (err) {
    logger.warn(
      { err, jobId },
      "[split] Failed to measure/store page geometry — proceeding degraded",
    );
    return false;
  }
}
