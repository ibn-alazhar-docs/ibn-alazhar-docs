/**
 * بوابة انجرار عقد صيغة التصدير (لا خدمات ولا قاعدة بيانات: مصدر المسار + الثابت).
 *
 * السبب الحقيقي لاختبار كهذا: `POST /api/documents/bulk-export` كان يعلن في مخططه
 * سبع صيغ (`md/txt/docx/epub/json/pdf/searchable-pdf`) بينما `exportByBatch` لا يقبل
 * في الخدمة إلا `format === "zip"` — و`zip` نفسها مرفوضة في المخطط. النتيجة: كل طلب
 * مطابق للعقد يُرفض 400 من الخدمة، وكل طلب يمكن أن ينجح يُرفض 400 من المخطط، فالمسار
 * مستحيل النجاح، ولا يُكتشف لأن خطأه لا يظهر كعطل ثابت بل كـ400 «منطقي» في كل مرة.
 *
 * التوكيد ليس «المخطط يقبل zip» (ذلك صحيح بالبناء الآن فلا يسقط أبدًا) بل منع رجوع
 * السبب: قائمة الصيغة في مسار الحزمة تُستورد من `EXPORT_FORMATS` ولا تُكتب حرفية،
 * فالعدّان — مخطط المسار وشرط الخدمة — مصدر واحد لا اثنين.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { EXPORT_FORMATS } from "@/core/services/export/types";

const WEB_SRC = path.resolve(__dirname, "../../apps/web/src");

function source(relative: string): string {
  return readFileSync(path.join(WEB_SRC, relative), "utf8");
}

/** قائمة الصيغة كما يكتبها ملف المسار: `format: z.enum(<معبّر>)`. */
function formatEnumSource(code: string): string {
  const match = code.match(/format:\s*z\.enum\(\s*([\w$.[\]"',\s-]+?)\s*[,)]/);
  if (!match) throw new Error("لا يوجد حقل format بـ z.enum في هذا المسار");
  return match[1];
}

describe("انجرار عقد صيغة التصدير", () => {
  const bulkRoute = source("app/api/documents/bulk-export/route.ts");
  const useCases = source("core/services/export.use-cases.ts");

  it("المصدر الواحد للعدّ includes zip التي تشترها خدمة الحزمة", () => {
    expect([...EXPORT_FORMATS]).toContain("zip");
    // صيغ الملفات المفردة التي تُوضع داخل الأرشيف تبقى معلَنة في العدّ نفسه.
    for (const format of ["md", "txt", "json", "pdf", "docx", "epub"]) {
      expect(EXPORT_FORMATS).toContain(format as (typeof EXPORT_FORMATS)[number]);
    }
  });

  it("مسار bulk-export يستورد العدّ ولا يعيد كتابته حرفيًا", () => {
    const declared = formatEnumSource(bulkRoute);
    expect(declared).toBe("EXPORT_FORMATS");
    expect(bulkRoute).toMatch(/from "@\/core\/services\/export\/types"/);
  });

  it("خدمة الحزمة ما زالت تنتج أرشيفًا فقط، فـ zip هي الصيغة الوحيدة المقبولة", () => {
    for (const method of ["exportByBatch", "exportByTag", "exportByFolder"]) {
      const start = useCases.indexOf(`async ${method}(`);
      expect(start, method).toBeGreaterThan(-1);
      expect(useCases.slice(start, start + 3000)).toMatch(/options\.format !== "zip"/);
    }
  });

  it("كل صيغة في العدّ تعالجها خدمة واحدة على الأقل", () => {
    // صيغة معلنة في العدّ ولا تعرفها أي خدمة هي الانجرار بعينه: المخطط يَعدُ والخدمة
    // ترفض، فيظهر للمستخدم كخطأ غامض لا كعقد خاطئ.
    const handled = [
      'options.format === "zip"',
      `["md", "txt", "json"]`,
      `["pdf", "docx", "epub"]`,
    ];
    for (const fragment of handled) {
      expect(useCases, `خدمة الملفات الفردية لم تعد تتعرف على ${fragment}`).toContain(fragment);
    }
    expect([...EXPORT_FORMATS]).toHaveLength(7);
  });
});
