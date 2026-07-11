-- AlterTable
ALTER TABLE "documents" ALTER COLUMN "fileSize" SET DATA TYPE BIGINT;

-- DropForeignKey
ALTER TABLE "folders" DROP CONSTRAINT "folders_parentId_fkey";

-- AddForeignKey
ALTER TABLE "folders" ADD CONSTRAINT "folders_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "folders"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Create normalize_arabic function
CREATE OR REPLACE FUNCTION normalize_arabic(text_to_normalize text)
RETURNS text AS $$
DECLARE
    normalized_text text;
BEGIN
    normalized_text := text_to_normalize;
    
    -- Normalize Alifs (أ, إ, آ -> ا)
    normalized_text := regexp_replace(normalized_text, '[أإآ]', 'ا', 'g');
    
    -- Normalize Ta Marbouta (ة -> ه)
    normalized_text := regexp_replace(normalized_text, 'ة', 'ه', 'g');
    
    -- Normalize Ya (ى -> ي)
    normalized_text := regexp_replace(normalized_text, 'ى', 'ي', 'g');
    
    -- Remove Tatweel (stretch character)
    normalized_text := regexp_replace(normalized_text, 'ـ', '', 'g');
    
    -- Remove Tashkeel (diacritics)
    -- Tashkeel characters: ً ٌ ٍ َ ُ ِ ّ ْ ٰ
    normalized_text := regexp_replace(normalized_text, '[ًٌٍَُِّْٰ]', '', 'g');
    
    RETURN normalized_text;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
