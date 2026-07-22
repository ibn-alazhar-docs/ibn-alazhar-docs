import { OCR_EXCLAMATION } from "../constants";
import {
  BULLET_START,
  ALLOWED_TRAILING,
  GARBAGE_THRESHOLD,
} from "../constants";

export function removeBrokenHtml(text: string): string {
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/?u>/gi, "");
  text = text.replace(/<\/?b>/gi, "");
  text = text.replace(/<\/?i>/gi, "");
  text = text.replace(/<\/?em>/gi, "");
  text = text.replace(/<\/?strong>/gi, "");
  text = text.replace(/<\/?span[^>]*>/gi, "");
  text = text.replace(/<\/?div[^>]*>/gi, "");
  text = text.replace(/<\/?p>/gi, "\n");
  text = text.replace(/<\/?font[^>]*>/gi, "");
  text = text.replace(/<\/?a[^>]*>/gi, "");
  text = text.replace(/<\/?sup>/gi, "");
  text = text.replace(/<\/?sub>/gi, "");
  text = text.replace(/<[a-zA-Z][^>]{0,50}>/g, "");
  text = text.replace(/\n{3,}/g, "\n\n");
  return text;
}

export function removeAsciiNoise(text: string): string {
  return text
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;
      if (trimmed.startsWith("#") || trimmed.startsWith("---")) return line;

      const arabicChars = (trimmed.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g) || [])
        .length;
      const totalChars = trimmed.replace(/\s/g, "").length;
      if (totalChars === 0) return line;

      const arabicRatio = arabicChars / totalChars;

      if (arabicRatio > 0.4) {
        return trimmed
          .replace(/\b[a-zA-Z]{1,2}\b/g, "")
          .replace(/\s{2,}/g, " ")
          .trim();
      }

      return line;
    })
    .join("\n");
}

export function normalizeArabicPunctuation(text: string): string {
  const arabicRange = "[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]";

  text = text.replace(new RegExp(`(${arabicRange}\\s*),`, "g"), "$1،");
  text = text.replace(new RegExp(`,\\s*(${arabicRange})`, "g"), "، $1");
  text = text.replace(/[،،]/g, "،");

  text = text.replace(new RegExp(`(${arabicRange}\\s*);`, "g"), "$1؛");
  text = text.replace(new RegExp(`;\\s*(${arabicRange})`, "g"), "؛ $1");
  text = text.replace(/[؛；]/g, "؛");

  text = text.replace(new RegExp(`(${arabicRange}\\s*)\\?`, "g"), "$1؟");
  text = text.replace(new RegExp(`\\?\\s*(${arabicRange})`, "g"), "؟ $1");
  text = text.replace(/[؟？]/g, "؟");

  text = text.replace(/[:：]/g, ":");
  text = text.replace(/[（]/g, "(");
  text = text.replace(/[）]/g, ")");
  text = text.replace(/[«»‹›〈〉]/g, (m) => (m === "«" || m === "‹" ? "" : ""));
  text = text.replace(/[—ー‒]/g, "–");
  text = text.replace(/[.]{3,}|[…⋯⋯]{1,}/g, "…");
  text = text.replace(/،{2,}/g, "،");
  text = text.replace(/؛{2,}/g, "؛");
  return text;
}

export function finalCleanup(text: string): string {
  return text
    .split("\n")
    .map((line) => {
      let l = line;
      l = l.replace(OCR_EXCLAMATION, "$1$2");
      if (
        !l.startsWith("## ") &&
        !l.startsWith("# ") &&
        !l.startsWith("### ") &&
        !l.startsWith("- ") &&
        !l.startsWith("> ") &&
        !BULLET_START.test(l)
      ) {
        l = l.replace(/^[^\u0600-\u06FF\w\d]+/, "");
      }
      l = l.replace(ALLOWED_TRAILING, "");
      return l;
    })
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return false;
      if (/^[\s\-–—•·*]+$/.test(trimmed)) return false;
      const chars = trimmed.replace(/\s/g, "");
      if (chars.length < 3) return true;
      const arabic = (chars.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g) || []).length;
      const english = (chars.match(/[a-zA-Z0-9]/g) || []).length;
      const punct = (chars.match(/[-.,!?:;،؟؛\](){}"'>&*%=@#«»]/g) || []).length;
      const known = arabic + english + punct;
      const ratio = chars.length > 0 ? known / chars.length : 1;
      return ratio >= 1 - GARBAGE_THRESHOLD;
    })
    .join("\n");
}
