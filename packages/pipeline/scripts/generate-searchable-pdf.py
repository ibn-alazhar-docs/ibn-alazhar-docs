#!/usr/bin/env python3
"""
generate-searchable-pdf.py — طبقة نصّ عربية بترتيبها المنطقي فوق صورة صفحة OCR.

المعمارية: WeasyPrint (Pango/HarfBuzz) يبني طبقة النصّ صفحةَ PDF واحدة بمقاس صفحة الصورة
وكلُّ سطرٍ منها كتلةٌ مطلقة بموضعها، ثم PyMuPDF يُلصقها فوق صفحة الصورة بـ `show_pdf_page`.
السبب قياسٌ على المخرَج لا افتراض — على PyMuPDF 1.28.2 + WeasyPrint 70.0 + Amiri المضمَّن:

  1. لا سبيل إلى طبقة عربية صحيحة بالكتابة المباشرة: `insert_textbox` و`insert_text`
     بخطّ Amiri نفسه تُستخرَج بترتيب بصري محارف معروضة (presentation forms) ومعكوسة —
     «الحمد لله رب العالمين» ⇒ «ﻥﻱﻡﻝﺍﻉﻝﺍ ﺏﺭ ﻩﻝﻝ ﺩﻡﺡﻝﺍ» (نطاق U+FE70–U+FEFF) — لأن
     MuPDF تبني ToUnicode بالبحث العكسي في cmap الخطّ وهو يحوي الأشكال السياقية،
     و`insert_htmlbox` أرجع محارف تايلندية/تبتية/سيريلية وأرجع طبقةً فارغة مع
     `color:transparent`. أمّا طبقة WeasyPrint بنفس السطور المطلقة فاستخراجها مطابقٌ
     للترتيب المنطقي بالمحارف الأساسية للداخل («الحمد لله رب العالمين» و«وقال ابن كثير
     رحمه الله في تفسيره» ⇒ تطابقٌ تامّ).
  2. `insert_textbox` يرجع عددًا سالبًا ولا يكتب شيئًا حين لا يسعَ النصُّ الصندوق
     (قيس: حجم ٢٠ في صندوق ٤٠ ⇒ ‎-17.4 واستخراجٌ فارغ). لذا كان المُنتَج القديم طبقة
     نصّ **فارغة** لسطرٍ واقعيٍّ تقريبًا في كل صفحة، بصمت: لا أحد يفحص القيمة الراجعة.
     هنا الفحص صريح: طبقة فارغة رغم سطورٍ مُدخَلة خطأٌ قاتل لا تحذير.
  3. البكسل ليس نقطة: صورة ١٢٤٠×١٧٥٤ بكسل يفتحها PyMuPDF على صفحة ٩٣٠×١٣١٥٫٥ نقطة
     (عامل ٠٫٧٥ = ٩٦dpi)، و`@page { size: 1000px }` في WeasyPrint يعطي ٧٥٠ نقطة (قيسٌ
     هنا أيضًا). فموضعُ السطر بالنقاط = بكسلاتُ الـ bbox × مقياس الصفحة المحسوب منها
     نفسه، وعرضُ صفحة الطبقة بالبكسل = عرضُها بالنقاط ÷ ٠٫٧٥ حتى تتطابق الصَّفحتان؛
     التطابق يُتحقَّق منه بعد التصيير ولا يُفترض.
  4. الشدّة تُقدَّم على الحركة التي تسبقها (نفس `orderShaddaFirst` في
     `src/output/pdf.ts`): بلا التحويل خرج «الرَّحْمَنِ» مستخرَجة «الرaَّحْمَنِ» بحرف
     لاتيني داخل الكلمة. لا يُحذف تشكيل ولا تُمسّ الهمزات — إعادة ترتيبٍ فقط.

الهندسة الرأسية مقيسة على Amiri: صندوق السطر الذي يرجعه الاستخراج = ١٫٧٥٨ × حجم الخط
(ascender+descender+gap للخطّ) مهما كان المحتوى، وحبرُ السطر العربي المجرّد ٠٫٩٨ × الحجم
والمشدّدُ كاملًا حتى ~١٫٤ × الحجم. فحجمُ الخطّ = ٠٫٦٢ × عُلُوّ الصندوق، و`line-height` =
عُلُوّ الصندوق نفسه، فيبقى صندوقُ السطر المستخرَج موازيًا لصندوق OCR ضمن ±٤٪ من عُلُوّه
ومتمركزًا على منتصفه؛ تكبيرُ العامل يُنزل الصندوق أسفل السطر التالي.

معلومٌ يبقى (من قياس pdf.ts نفسه وعلى ثلاث دقاتٍ هنا): أولَ حركة وآخرَ حركة في السطر قد
ينزاح موضعُها عند الاستخراج، فلا تُقاس البوابة على حافّتَي السطر بل على كلماته الداخلية.
وكذلك السطرُ المختلط الاتجاه: MuPDF يرجع كلَّ عنوانِ اتجاهٍ أحاديّ بكامله لكنه يصفُ
العناوينَ بالترتيب البصري («Page 12 رقم 34 ABC» ⇒ «ABC 34 رقم Page 12»)، فالكلمةُ تنجو
والسطرُ المختلط لا يُطابَق حرفيًا — قياسٌ لا تفسيرٌ بديل، والبوابةُ توثّقه.

وضعُ الانسياب (flow): إن غابت سطورُ المواضع (لا `bbox` لدى المزوّد — Gemini مثلًا) ووجد
لنصّ الصفحة وجودٌ (`text` في JSON المُدخَل)، بُنيت الطبقةُ منه كتلةً واحدة غير مرئية:
الترتيب المنطقي سليمٌ والبحثُ يعمل، والموضعُ تقريبيٌّ بحدود منطقة النصّ — يُصرَّح به على
stderr ولا تُسلَّم الطبقةُ التقريبية كأنها مطابقة. البوابةُ النهائية كما هي: نصٌّ وُعدَ
وملفٌّ يُستخرج فارغًا ⇒ فشلٌ قاتل لا تسليمٌ صامت.
"""

import json
import re
import sys
import tempfile
from html import escape as escape_html
from pathlib import Path

# PyMuPDF يطبع تحذير deprecation على stderr؛ الاستيراد لا يتوقف عليه.
try:
    import fitz  # PyMuPDF
except ImportError as err:  # بلا هذا لا تُقرأ الصورة ولا تُلصق الطبقة
    sys.stderr.write(
        "generate-searchable-pdf: PyMuPDF (fitz) غير مثبت على مفسّر Python هذا — ثبّته "
        f"أو اضبط WEASYPRINT_PYTHON على المفسّر الصحيح ({err}).\n"
    )
    raise SystemExit(3)

try:
    import weasyprint
except ImportError as err:  # الطبقة لا تُبنى بغيره: لا رجوع إلى طبقة صامتة فارغة
    sys.stderr.write(
        "generate-searchable-pdf: WeasyPrint غير مثبت على مفسّر Python هذا، والطبقة "
        "النصّية لا تُبنى بغيره (PyMuPDF وحده يُخرج ترتيبًا بصريًا أو طبقة فارغة) — "
        f"ثبّته بـ pip install weasyprint أو اضبط WEASYPRINT_PYTHON ({err}).\n"
    )
    raise SystemExit(3)

# بكسل CSS إلى نقطة: ٧٢/٩٦. قيس بتصيير `@page { size: 1000px 300px }` ⇒ صفحة ٧٥٠×٢٢٥ نقطة.
PT_PER_CSS_PX = 0.75

# حجم الخط نسبةً إلى عُلُوّ صندوق السطر بعد المقياس — انظر القياس في رأس الملف (١٫٧٥٨ × الحجم).
FONT_SIZE_FACTOR = 0.62

# أدنى/أقصى حجم خطّ في وضع الانسياب، وعُلُوّ السطر فيه ١٫٧٥٨ × الحجم (مقيسٌ في الرأس)،
# ومتوسط تقدّم الحرف العربي ٠٫٥٥ × الحجم — تقديرٌ لا طباعةٌ دقيقة: الموضعُ تصريحيًا تقريبي.
FLOW_MIN_PT = 4.0
FLOW_MAX_PT = 28.0
FLOW_LINE_HEIGHT_FACTOR = 1.758
FLOW_AVG_CHAR_EM = 0.55

# عنقودُ الحركات (U+064B–U+0650 و U+0652) المتبوعةٍ بالشدّة (U+0651)؛ نفس نمط pdf.ts.
SHADDA_CLUSTER_RE = re.compile("[\u064b-\u0650\u0652]+\u0651+")

AMIRI_REGULAR = "Amiri-Regular.ttf"


def order_shadda_first(text: str) -> str:
    """يقدّم الشدّة على الحركات في عنقودها — ترتيب الإدخال الموصى به عربيًا في Unicode،
    والرسم واحد قياسًا، ولا حذفٍ لتشكيل ولا مسٍّ للحروف والهمزات."""

    def reorder(cluster: re.Match[str]) -> str:
        marks = cluster.group(0)
        return "\u0651" * marks.count("\u0651") + "".join(c for c in marks if c != "\u0651")

    return SHADDA_CLUSTER_RE.sub(reorder, text)


def find_amiri(font_dir: str | None) -> Path:
    """يحلّ Amiri من نفس قائمة المرشّحات التي يراها `findAmiriFonts` في embed-fonts.ts:
    دليلُ الخطّ الممرَّر وسيطًا رابعًا أولًا، ثم الأصل المودَع في المستودع بجوار السكربت،
    ثم الحزمة النظامية، ثم أدلة المستخدم. لا مسار شخصي مضمّن في السكربت."""
    candidates: list[Path] = []
    if font_dir:
        candidates.append(Path(font_dir) / AMIRI_REGULAR)
    script_dir = Path(__file__).resolve().parent
    candidates.append(script_dir.parent / "assets" / "fonts" / AMIRI_REGULAR)
    candidates.append(Path("/usr/share/fonts/opentype/fonts-hosny-amiri") / AMIRI_REGULAR)
    candidates.append(Path.home() / ".fonts" / AMIRI_REGULAR)
    candidates.append(Path.home() / ".local" / "share" / "fonts" / AMIRI_REGULAR)
    for path in candidates:
        if path.is_file():
            return path
    raise SystemExit(
        "generate-searchable-pdf: خطّ Amiri (Amiri-Regular.ttf) غير موجود — ثبّت "
        "fonts-hosny-amiri أو مرّر دليل الخطّ وسيطًا رابعًا."
    )


def line_block(text: str, bbox: list[float], scale: float, page_w_pt: float) -> str:
    """كتلةٌ مطلقة واحدة لسطر OCR: الحافة اليمنى عند x1 (سطر RTL) والعرضُ والعُلُوّ من
    الـ bbox نفسه، مضروبةً في مقياس البكسل→النقطة للصفحة، ومحولةً إلى بكسل CSS لأن
    مواضع الصفحة تُقاس بها. النصُّ هربٌ من HTML دائمًا: لا يُمرَّر خامًا ولا إلى CSS."""
    x0, y0, x1, y1 = (v * scale for v in bbox)
    w_pt = x1 - x0
    h_pt = y1 - y0
    font_pt = h_pt * FONT_SIZE_FACTOR
    return (
        f'<div class="l" style="'
        f"top:{y0 / PT_PER_CSS_PX:.3f}px;"
        f"right:{(page_w_pt - x1) / PT_PER_CSS_PX:.3f}px;"
        f"width:{w_pt / PT_PER_CSS_PX:.3f}px;"
        f"height:{h_pt / PT_PER_CSS_PX:.3f}px;"
        f"line-height:{h_pt / PT_PER_CSS_PX:.3f}px;"
        f'font-size:{font_pt:.3f}pt;">{escape_html(order_shadda_first(text), quote=True)}</div>'
    )


def placeable_lines(lines: list) -> list[tuple[str, list[float]]]:
    """يبقى من سطور OCR ما له نصٌّ وصندوقٌ صالح بترتيب [x0, y0, x1, y1] بالبكسل.
    غيرُ الرقمي خطأٌ في المُدخَل لا حالةٌ تُمرَّر بصمت: الاستخراج من صور مصغَّرة أو
    مُطبَّعة يختلف عن بكسلات الصفحة، والسطر المنزاح نصف الورقة أسوأ من وظيفة فاشلة."""
    out: list[tuple[str, list[float]]] = []
    for index, line in enumerate(lines):
        if not isinstance(line, dict):
            raise SystemExit(f"generate-searchable-pdf: السطر {index} في JSON ليس كائنًا.")
        text = str(line.get("text") or "").strip()
        if not text:
            continue
        bbox = line.get("bbox")
        if not isinstance(bbox, (list, tuple)) or len(bbox) != 4:
            continue  # بلا صندوق لا موضع: السطر يُترك ولا يُختلق له مكان
        if any(isinstance(v, bool) or not isinstance(v, (int, float)) for v in bbox):
            raise SystemExit(
                f"generate-searchable-pdf: bbox السطر {index} ليس أربع أرقام: {bbox!r}"
            )
        x0, y0, x1, y1 = (float(v) for v in bbox)
        if x1 - x0 <= 0 or y1 - y0 <= 0:
            continue
        out.append((text, [x0, y0, x1, y1]))
    return out


def build_overlay_html(
    placed: list[tuple[str, list[float]]],
    page_w_pt: float,
    page_h_pt: float,
    scale: float,
    font_uri: str,
) -> str:
    """صفحةٌ واحدة بمقاس صفحة الصورة بالضبط (بكسل = نقطة ÷ ٠٫٧٥) بهامش صفر.
    `white-space: nowrap` يمنع التفافَ السطر الطويل الذي كان ينزل به سطرًا آخر فيكذب
    موضعه؛ والالتصاق باليمين يجعل الحافة اليمنى للنصّ عند x1 حيث تنتهي كلمة الأصل."""
    body = "\n".join(line_block(text, bbox, scale, page_w_pt) for text, bbox in placed)
    page_w_px = page_w_pt / PT_PER_CSS_PX
    page_h_px = page_h_pt / PT_PER_CSS_PX
    return f"""<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<style>
/* خطٌّ واحد مضمَّن صراحةً: الرجوع لخطوط النظام يُسقط الهمزات من ToUnicode (قيس pdf.ts). */
@font-face {{ font-family: "Amiri"; src: url("{font_uri}"); }}
html, body, div {{ font-family: "Amiri"; }}
@page {{ size: {page_w_px:.3f}px {page_h_px:.3f}px; margin: 0; }}
html, body {{ margin: 0; padding: 0; position: relative; overflow: visible;
  width: {page_w_px:.3f}px; height: {page_h_px:.3f}px; }}
body {{ color: transparent; direction: rtl; }}
.l {{ position: absolute; text-align: right; white-space: nowrap; overflow: visible; }}
</style>
</head>
<body>
{body}
</body>
</html>
"""


def flow_font_size(text: str, width_pt: float, height_pt: float) -> float:
    """أكبر حجم خطّ يبقى مجموعُ أسطره المُقدَّرة داخل منطقة النصّ — بحثٌ ثنائي على
    ارتفاعٍ محسوب بـ FLOW_AVG_CHAR_EM، لا طباعة حقيقية: الهدفُ ألّا تخرج الكتلةُ عن
    صفحةٍ واحدة (تجاوزُها يولّد صفحةَ overlay إضافية فتسقط بوابةُ تطابق المقاس)."""

    def total_height(font_pt: float) -> float:
        per_line = max(1, int(width_pt / (FLOW_AVG_CHAR_EM * font_pt)))
        lines = sum(max(1, -(-len(par) // per_line)) for par in text.split("\n"))
        return lines * FLOW_LINE_HEIGHT_FACTOR * font_pt

    if total_height(FLOW_MIN_PT) > height_pt:
        return FLOW_MIN_PT
    lo, hi = FLOW_MIN_PT, FLOW_MAX_PT
    if total_height(hi) <= height_pt:
        return hi
    for _ in range(24):
        mid = (lo + hi) / 2
        if total_height(mid) <= height_pt:
            lo = mid
        else:
            hi = mid
    return lo


def build_flow_html(page_text: str, page_w_pt: float, page_h_pt: float, font_uri: str) -> str:
    """صفحةُ الطبقة الانسيابية: بمقاس صفحة الصورة نفسه (كوضع السطور) وكتلةٌ واحدة
    مطلقةُ الموضع عند حافة النصّ المتوقَّعة (هامش ٧٪ لكل حافة)؛ النصُّ مُهرَّبٌ من HTML
    دائمًا ومُعادُ ترتيبِ شدّته كما في وضع السطور — الترتيبُ المنطقي حقٌّ لا يُساوم عليه."""
    inset = 0.07
    usable_w_pt = page_w_pt * (1.0 - 2.0 * inset)
    usable_h_pt = page_h_pt * (1.0 - 2.0 * inset)
    font_pt = flow_font_size(page_text, usable_w_pt, usable_h_pt)
    inset_x_px = inset * page_w_pt / PT_PER_CSS_PX
    inset_y_px = inset * page_h_pt / PT_PER_CSS_PX
    line_h_px = font_pt * FLOW_LINE_HEIGHT_FACTOR / PT_PER_CSS_PX
    body = escape_html(order_shadda_first(page_text), quote=True)
    return f"""<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<style>
@font-face {{ font-family: "Amiri"; src: url("{font_uri}"); }}
html, body, div {{ font-family: "Amiri"; }}
@page {{ size: {page_w_pt / PT_PER_CSS_PX:.3f}px {page_h_pt / PT_PER_CSS_PX:.3f}px; margin: 0; }}
html, body {{ margin: 0; padding: 0; position: relative; overflow: visible;
  width: {page_w_pt / PT_PER_CSS_PX:.3f}px; height: {page_h_pt / PT_PER_CSS_PX:.3f}px; }}
body {{ color: transparent; direction: rtl; }}
.f {{ position: absolute; text-align: right; white-space: pre-wrap; overflow-wrap: break-word;
  top: {inset_y_px:.3f}px; right: {inset_x_px:.3f}px; width: {usable_w_pt / PT_PER_CSS_PX:.3f}px;
  line-height: {line_h_px:.3f}px; font-size: {font_pt:.3f}pt; }}
</style>
</head>
<body>
<div class="f">{body}</div>
</body>
</html>
"""


def image_pixel_dims(image_doc: "fitz.Document") -> tuple[float, float]:
    """عرضُ الصورة وارتفاعُها ببكسلاتهما الأصلية كما قرأهما PyMuPDF. المصدرُ بالبكسل
    والصفحةُ بالنقطة: بلا هذا القيس كان كلُّ سطرٍ يُوضع على ٤/٣ من موضعه الصحيح
    (قيسُ ورقتين: ٨٤٠×١١٨٩ بكسل ⇒ ٤٠٣٫٢×٥٧٠٫٧٢ نقطة، و١٢٤٠×١٧٥٤ ⇒ ٩٣٠×١٣١٥٫٥ —
    العاملُ واحدٌ في الاتجاهين لأن التصيير يحفظ النِّسبة، فمقياسٌ واحد يكفيهما)."""
    info = image_doc[0].get_image_info(xrefs=False)
    if not info:
        raise SystemExit("generate-searchable-pdf: لا صورة في ملف الصفحة — لا طبقة تُبنى.")
    px_w = float(info[0]["width"])
    px_h = float(info[0]["height"])
    if px_w <= 0 or px_h <= 0:
        raise SystemExit(f"generate-searchable-pdf: مقاس الصورة غير صالح ({px_w}×{px_h}).")
    return px_w, px_h


def main() -> None:
    args = sys.argv[1:]
    if len(args) < 3:
        sys.stderr.write(
            "Usage: generate-searchable-pdf.py <input_image> <input_json> <output_pdf> "
            "[amiri_font_dir]\n"
        )
        raise SystemExit(2)
    img_path, json_path, out_path = args[0], args[1], args[2]
    font_dir = args[3] if len(args) > 3 else None

    font_uri = find_amiri(font_dir).as_uri()

    with open(json_path, "r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise SystemExit("generate-searchable-pdf: JSON المُدخَل ليس كائنًا {lines, text}.")
    lines = data.get("lines") or []
    if not isinstance(lines, list):
        raise SystemExit("generate-searchable-pdf: حقل lines في JSON ليس قائمة.")
    page_text = str(data.get("text") or "").strip()

    placed = placeable_lines(lines)

    image_doc = fitz.open(img_path)
    px_w, px_h = image_pixel_dims(image_doc)
    pdf_bytes = image_doc.convert_to_pdf()
    image_doc.close()

    doc = fitz.open("pdf", pdf_bytes)
    page = doc[0]
    page_w_pt = page.rect.width
    page_h_pt = page.rect.height
    # نقطةٌ لكل بكسل، محسوبةٌ من هذه الصفحة لا ثابتٌ مفروض: صورةٌ بدقةٍ أخرى تُفتح بعرضٍ
    # آخر، والمقياسُ واحدٌ في الاتجاهين لأن التصيير يحفظ النِّسبة (انظر image_pixel_dims).
    scale = page_w_pt / px_w
    if abs(page_h_pt / px_h - scale) > 0.01:
        raise SystemExit(
            "generate-searchable-pdf: نسبة العرض إلى الارتفاع في صفحة الصورة لا تطابق "
            f"الصورة ({page.rect.width}×{page.rect.height} نقطة مقابل {px_w}×{px_h} بكسل)."
        )

    if placed:
        html = build_overlay_html(placed, page_w_pt, page_h_pt, scale, font_uri)
    elif page_text:
        # لا سطورٌ بمواضع (المزوّد لا يُرجع geometry) لكنَّ للنصّ وجودًا: انسيابٌ
        # تقريبيُّ الموضع خيرٌ من ملفٍ يُسلَّم غيرَ قابل للبحث بصمت.
        sys.stderr.write(
            "generate-searchable-pdf: لا سطورَ بمواضعَ صالحة — الطبقةُ مبنيةٌ من نصّ "
            "الصفحة كتلةً انسيابيةً واحدة: ترتيبٌ منطقيٌّ صحيح وموضعٌ تقريبيٌّ غير مطابق.\n"
        )
        html = build_flow_html(page_text, page_w_pt, page_h_pt, font_uri)
    elif lines:
        sys.stderr.write(
            f"generate-searchable-pdf: {len(lines)} سطرًا في JSON بلا واحدٍ صالح "
            "(نصٌّ فارغ أو bbox غير رباعي أو عُلُوّ/عرض ≤ ٠) وبلا نصّ صفحة — لا طبقة تُبنى.\n"
        )
        html = None
    else:
        html = None

    if html is not None:
        with tempfile.TemporaryDirectory(prefix="searchable-overlay-") as tmp:
            html_file = Path(tmp) / "overlay.html"
            overlay_pdf = Path(tmp) / "overlay.pdf"
            html_file.write_text(html, encoding="utf-8")
            try:
                weasyprint.HTML(filename=str(html_file)).render().write_pdf(str(overlay_pdf))
            except Exception as err:  # فشل تصيير المحرّك: لا طبقة صامتة ولا مُنتَج ناقص
                raise SystemExit(
                    f"generate-searchable-pdf: فشل تصيير طبقة النصّ بـ WeasyPrint: {err}"
                ) from err
            overlay = fitz.open(str(overlay_pdf))
            # مقاسا الصَّفحتين يجب أن يتطابقا قبل اللصق، وإلّا انزاح كلُّ سطرٍ بنسبة.
            if abs(overlay[0].rect.width - page_w_pt) > 1 or abs(
                overlay[0].rect.height - page_h_pt
            ) > 1:
                raise SystemExit(
                    "generate-searchable-pdf: مقاس صفحة الطبقة لا يطابق صفحة الصورة "
                    f"({overlay[0].rect} مقابل {page.rect}) — تصحيح الهندسة فشل."
                )
            # طبقة النصّ مُلصَقة على كامل الورقة بلا تحجيم: الصَّفحتان بمقاسٍ واحد قياسًا
            # فأيُّ تحجيمٍ كان يزيح السطور. `show_pdf_page` في PyMuPDF 1.28 لا يقبل
            # opacity — الشفافية مسؤولية الحبر نفسه (`color: transparent`)، ويُقاس أن
            # المخرج يطابق الصورة مجردةً بكسلًا (بوابة searchable-pdf.test.ts).
            page.show_pdf_page(page.rect, overlay, 0, keep_proportion=False)
            overlay.close()

    doc.save(out_path, garbage=3, deflate=True)
    doc.close()

    # الفحص النهائي على الملف المكتوب نفسه: الطبقة موجودة فعلاً — وعدَ السطورُ أو وعدَ
    # الانسياب. السكربت القديم كان يكتب طبقةً فارغةً بصمت لأن insert_textbox كان يسقط
    # ولا يُعلم أحدًا.
    written = fitz.open(out_path)
    extracted = "".join(written[i].get_text() for i in range(written.page_count))
    page_count = written.page_count
    written.close()
    if (lines or html is not None) and not extracted.strip():
        raise SystemExit(
            f"generate-searchable-pdf: فُقدت طبقة النصّ بعد الكتابة ({len(placed)} سطرًا "
            f"أو {len(page_text)} حرفًا انسيابيًا على {page_count} صفحة "
            "والاستخراج فارغ) — المُنتَج مرفوض ولا يُسلَّم."
        )


if __name__ == "__main__":
    main()
