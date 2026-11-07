#!/usr/bin/env python3
"""
page-geometry.py — مقاسُ الصفحة وهوامشُها مقروءان من الأصل نفسه.

القاعدة التي يُخدَم بها هذا السكربت: «المُنتَج نسخةٌ طبق الأصل من الأصل في كل شيء» —
إن كانت صفحةُ المخطوط ١٢×١٩ سم وهامشُ يسارها ١٫٥ سم فيجب أن يكون المُصدَّر كذلك.
والعيبُ الذي يُصلحه ثابتٌ في المُصدِّرات: `@page { size: A4; margin: 2cm }` مكتوبةٌ
حرفيًا في `src/output/pdf.ts`، والـ DOCX يرث مقاسَه من مرجعٍ واحد ثابت
(`reference_rtl.docx`) لا من المستند. فالهندسة تُقاس مرةً واحدة هنا وتُستهلَك في التصدير.

لماذا لا تُشتَقّ من صور التقسيم: `split-pdf.py` يُخرج أبعادًا بالبكسل **بعد** المعالجة
القبلية (deskew/upscale يغيّرانها)، فهي أبعادُ صورة OCR لا أبعادُ صفحة الأصل. لذلك
يُفتح ملفُّ الـ PDF نفسه هنا، ولا يُعتمد على رقمٍ خرج من مسارٍ معدِّل للصور.

الوحدةُ واحدة: النقاط كما يقرأها القارئ. `page.rect` هو المقاسُ بعد تصحيح `/Rotate`
— الورقةُ الممسوحة أفقيةً والمحفوظة رأسيةً تُقاس كما تُعرض، و`page.mediabox` لا يفعل.
و`get_text("blocks")` يرجع مربعاتِه بالنقاط أيضًا، فيبقى الحسابُ بلا تحويلات؛ وهو نفس
اصطلاح `generate-searchable-pdf.py` (صورة ١٢٤٠×١٧٥٤ بكسل ⇒ صفحة ٩٣٠×١٣١٥٫٥ نقطة،
عامل ٠٫٧٥ = ٩٦dpi).

لا اختلاق: صفحةٌ ممسوحةٌ بلا نصٍّ مضمَّن يكون `text` فيها null. لو اختُرع مربعٌ لها
لصار الهامشُ المخترَع «قياسًا» يُنسب إلى الأصل، وهو بالضبط ما ترفضه القاعدة. لذا تُستثنى
كتلُ الصور (`block_type != 0`) من الاتحاد: مستطيلُ الصورة حبرٌ لا نصّ، ودخولُه كان
سيجعل كلَّ صفحةٍ ممسوحةٍ ذاتَ «نصٍّ» يملأ الورقة فيخرج هامشٌ صفريّ مقاسًا زورًا.

الفشلُ لا يُسقط القياس: صفحةٌ تعذّرت قراءتُها تُتخطّى وتُذكر على stderr، ولا يستثناءٌ
يخرج من الحلقة. وعلى خطأٍ كامل يُطبع `{"error": ...}` على stdout ويخرج غيرُ صفر، فيُرجع
المستدعي null ويرتقي التصديرُ إلى A4/٢سم كما كان — الهندسةُ تحسينٌ لا شرطُ نجاح.
"""

import json
import math
import sys
from pathlib import Path

# PyMuPDF يطبع تحذير deprecation على stderr عند استيراد الاسم القديم `fitz`؛ الاسمُ
# الحديث يُجرَّب أولًا فلا تختلط التحذيرات بالتشخيص الذي يقرؤه المستدعي ويُنذِر به.
try:
    import pymupdf as fitz  # PyMuPDF >= 1.24
except ImportError:  # التوزيعات الأقدم لا تعرف الاسم الحديث
    try:
        import fitz  # type: ignore[no-redef]  # PyMuPDF < 1.24
    except ImportError as err:
        sys.stderr.write(
            "page-geometry: PyMuPDF غير مثبت على مفسّر Python هذا — ثبّته بـ "
            f"pip install pymupdf أو اضبط WEASYPRINT_PYTHON على المفسّر الصحيح ({err}).\n"
        )
        raise SystemExit(3)

# سقفُ الصفحات المقاسة: الوسيطُ في جهة Node لا يحتاج الكتابَ كلَّه، وفتحُ بلوكات كلِّ
# صفحةٍ من مسحات المخطوطات هو كلفةُ هذا المسار. ٠ أو أقلّ = بلا سقف.
DEFAULT_MAX_PAGES = 200


def _as_float(value: object) -> float | None:
    try:
        number = float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) else None


def text_union_pt(page) -> dict | None:
    """اتحادُ مربعات كتلِ النصّ بالنقاط، أو null حين لا نصَّ مضمَّنًا في الصفحة."""
    blocks = page.get_text("blocks")
    x0 = y0 = math.inf
    x1 = y1 = -math.inf
    for block in blocks:
        # صورةٌ لا نصّ: مستطيلُها حبرٌ ولا موضعَ فيه لحروف، فإدخالُه يُلغي null
        # الواجبة للصفحة الممسوحة ويُخرج هامشًا صفريًا مقاسًا زورًا.
        block_type = block[6] if len(block) > 6 else 0
        if block_type != 0:
            continue
        bx0 = _as_float(block[0])
        by0 = _as_float(block[1])
        bx1 = _as_float(block[2])
        by1 = _as_float(block[3])
        if bx0 is None or by0 is None or bx1 is None or by1 is None:
            continue
        if bx1 <= bx0 or by1 <= by0:  # كتلةٌ عديمة المساحة: لا تُوسّع اتحادًا
            continue
        x0 = min(x0, bx0)
        y0 = min(y0, by0)
        x1 = max(x1, bx1)
        y1 = max(y1, by1)
    if x0 == math.inf:
        return None
    return {
        "x0": round(x0, 2),
        "y0": round(y0, 2),
        "x1": round(x1, 2),
        "y1": round(y1, 2),
    }


def parse_max_pages(raw: str | None) -> int:
    if raw is None:
        return DEFAULT_MAX_PAGES
    try:
        value = int(raw)
    except ValueError as err:
        raise SystemExit(f"page-geometry: max_pages غير رقمي: {raw!r} ({err})") from err
    return max(0, value)


def main() -> None:
    if len(sys.argv) < 2:
        sys.stderr.write("page-geometry: الاستخدام: page-geometry.py <input_pdf> [max_pages]\n")
        raise SystemExit(2)

    pdf_path = Path(sys.argv[1])
    max_pages = parse_max_pages(sys.argv[2] if len(sys.argv) > 2 else None)

    try:
        doc = fitz.open(str(pdf_path))
    except Exception as err:  # ملفٌ تالف أو غير مقروء: خطأٌ مُهيكل لا كومةُ آثار
        sys.stdout.write(json.dumps({"error": f"PDF_OPEN_FAILED: {err}"}, ensure_ascii=False))
        raise SystemExit(4)

    pages: list[dict] = []
    skipped = 0
    total_pages = doc.page_count
    limit = total_pages if max_pages <= 0 else min(total_pages, max_pages)
    try:
        for index in range(limit):
            try:
                page = doc[index]
                # `rect` لا `mediabox`: الأولُ يُطبق /Rotate فيخرج كما يراه القارئ،
                # والثاني يحفظ الإحداثيات الخام فتُقلب المسحاتُ الأفقية أبعادًا خطأ.
                rect = page.rect
                width_pt = _as_float(rect.width)
                height_pt = _as_float(rect.height)
                if width_pt is None or height_pt is None or width_pt <= 0 or height_pt <= 0:
                    raise ValueError(f"مقاسُ صفحة غير صالح: {rect}")
                pages.append(
                    {
                        "number": index + 1,
                        "widthPt": round(width_pt, 2),
                        "heightPt": round(height_pt, 2),
                        "text": text_union_pt(page),
                    }
                )
            except Exception as err:  # صفحةٌ واحدة لا تُسقط القياس كلَّه
                skipped += 1
                sys.stderr.write(f"page-geometry: تُخطّئت الصفحة {index + 1}: {err}\n")
    finally:
        doc.close()

    # pageCount عددُ الصفحات **المقاسة** لا extent الكتاب: إن جاوز الكتابُ السقفَ
    # فالمقيسُ عيّنةٌ والوسيطُ عليها، ولا يُنسَب رقمٌ هنا إلى غير ما قيس فعلًا.
    payload = {"pageCount": len(pages), "pages": pages}
    sys.stdout.write(json.dumps(payload, ensure_ascii=False) + "\n")

    if skipped:
        sys.stderr.write(
            f"page-geometry: قُيست {len(pages)} صفحة وتُخطّئت {skipped} من أصل "
            f"{limit} عُولجت (السقف {max_pages or 'بلا سقف'}).\n"
        )


if __name__ == "__main__":
    main()
