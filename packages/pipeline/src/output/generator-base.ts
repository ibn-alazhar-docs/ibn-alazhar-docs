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
