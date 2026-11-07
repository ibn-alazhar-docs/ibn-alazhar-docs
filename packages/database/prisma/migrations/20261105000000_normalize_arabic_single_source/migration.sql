-- توحيد تطبيع البحث العربي: JS وSQL تعريفٌ واحد، حرفًا بحرف.
--
-- لماذا تغيّر التعريف: النسخة القديمة كانت تطوي تسع علامات فقط، ولا تطوي ٱ
-- (U+0671)، و ؤ/ئ كانتا تُطويان في JS إلى ء عارية بينما SQL يتركهما. فثلاث
-- فئات من البحث كانت تختفي بصمت بلا خطأ: كلمات المخطوطات الحاملة لهمزة الوصل،
-- وكل نصّ مشكّل بمدّ U+0653 أو بعلامات قرآنية U+06D6-U+06ED وامتداداتها
-- (طرف JS كان يُزيلها وSQL يُبقيها في المتجه)، و«سؤل» مقابل «سول».
-- المصدر القياسي الآن في:
--   apps/web/src/shared/arabic-search-normalize.ts
-- وهذه الهجرة هي نفس الجدول مكتوبًا حروفًا. الانحراف بينهما نتائجُ بحثٍ تختفي
-- دون رسالة، لذلك يقفل التطابقَ حرفًا بحرف الاختبار:
--   tests/backend/arabic-search-normalize-single-source.test.ts
-- (يقرأ هذا الملف ويُطابق أزواج الطي وطبقة العلامات مع JS — لا تُعدّل إحداهما
-- دون الأخرى).

-- AlterFunction: normalize_arabic — نفس تعريف normalizeArabicForSearch في JS.
-- (التصغير لا يحتاجه SQL: to_tsvector/plainto_tsquery بوضع 'simple' يصغّر
-- ASCII على الطرفين.)
CREATE OR REPLACE FUNCTION normalize_arabic(text_to_normalize text)
RETURNS text AS $$
DECLARE
    normalized_text text;
BEGIN
    normalized_text := text_to_normalize;

    -- الهمزة على واو/ياء -> الحرف الحامل (ؤ -> و ، ئ -> ي)، لا إلى ء عارية.
    normalized_text := regexp_replace(normalized_text, 'ؤ', 'و', 'g');
    normalized_text := regexp_replace(normalized_text, 'ئ', 'ي', 'g');

    -- الألفات: أ (U+0623) إ (U+0625) آ (U+0622) ٱ (U+0671) -> ا (U+0627)
    normalized_text := regexp_replace(normalized_text, '[أإآٱ]', 'ا', 'g');

    -- الياءات: ى (U+0649) ک (U+06A9) ی (U+06CC) -> ي (U+064A)
    normalized_text := regexp_replace(normalized_text, '[ىکی]', 'ي', 'g');

    -- التاء المربوطة: ة (U+0629) -> ه (U+0647)
    normalized_text := regexp_replace(normalized_text, 'ة', 'ه', 'g');

    -- التطويل (tatweel U+0640).
    normalized_text := regexp_replace(normalized_text, 'ـ', '', 'g');

    -- كل علامات التشكيل والقرآن المقيسة (لا التسع القديمة فقط):
    -- U+0610-U+061A U+064B-U+065F U+0670 U+06D6-U+06ED
    -- U+0898-U+089F U+08CA-U+08E1 U+08E3-U+08FF  (= TASHKEEL_SOURCE القياسي)
    normalized_text := regexp_replace(normalized_text, '[ؐ-ًؚ-ٰٟۖ-ۭ࢘-࢟࣊-ࣣ࣡-ࣿ]', '', 'g');

    RETURN normalized_text;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Backfill: إعادة حساب المتجهات المحفوظة بالتعريف الجديد (نفس نمط
-- 20260616120000_db_hardening؛ trigger trg_update_searchvector من
-- 20260707120000 سيعيد الحساب عند أي كتابة لاحقة، وهذا يُصلح الصفوف القديمة).
UPDATE documents SET
  searchvector = to_tsvector('simple',
    COALESCE(normalize_arabic(title), '') || ' ' ||
    COALESCE(normalize_arabic(description), '') || ' ' ||
    COALESCE(normalize_arabic("originalName"), '')
  );
