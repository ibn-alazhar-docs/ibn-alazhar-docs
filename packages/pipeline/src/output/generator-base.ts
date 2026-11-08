import type { DocumentIR } from "@ibn-al-azhar-docs/shared";
import type { PageGeometry } from "./page-geometry";

export interface GeneratorOptions {
  fileName?: string;
  title?: string;
  /** اتجاه المستند الافتراضي للتصدير (RTL للعربية هو الافتراضي في DOCX). */
  rtl?: boolean;
  /** خط العربية المعقّد في `w:cs` (افتراضيًا Amiri — الخط المضمَّن فعلًا). */
  csFont?: string;
  /**
   * هندسةُ صفحات الأصل المقيسةُ عند الاستقبال: ورقةٌ وهوامشُ كما في الأصل، لا A4
   * ثابتةٌ في PDF ولا مقاسُ المرجع في DOCX. غائبةً يخرج كلُّ مولّدٍ كما كان.
   */
  geometry?: PageGeometry;
  [key: string]: unknown;
}

export interface FormatGenerator {
  generate(ir: DocumentIR, options?: GeneratorOptions): Promise<Buffer> | Buffer;
  getMimeType(): string;
  getExtension(): string;
}

/**
 * تطبيع الأسطر الزائدة: ثلاثة أسطر جديدة متتالية أو أكثر تنهار إلى اثنين،
 * ثم تُقصّ الأطراف. نفس سلسلة `replace(/\\n{3,}/g, "\\n\\n").trim()` التي كانت
 * مكرَّرة حرفيًا في مولّدَي Markdown وTXT من الـ IR — وحدة واحدة حتى لا تختلف
 * إخراجاتهما بايتًا واحدًا عند تعديلها.
 */
export function normalizeBlankLines(text: string): string {
  return text.replace(/\n{3,}/g, "\n\n").trim();
}
