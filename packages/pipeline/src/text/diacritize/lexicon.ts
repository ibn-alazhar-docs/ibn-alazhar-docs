/**
 * Curated diacritization data tables for the deterministic engine.
 *
 * Every value is a documented, standard-form vocalization (mushaf-style
 * orthography: plain alif for hamzat al-wasl, shadda on the assimilated
 * lam of the definite article, dagger alif U+0670 inside الرَّحْمَٰن).
 * Nothing here is guessed: an entry is present only when its in-context
 * form is settled Arabic. Declinable nouns carry CORE vowels only (no
 * final case vowel) — case is a syntactic decision this engine refuses to
 * fake; invariant words carry their full form.
 */

export interface Lexeme {
  /** Vocalized form for continuous speech (wis al-wasl). */
  full: string;
  /** Override pause form when the generic waqf derivation does not apply. */
  pause?: string;
  /** True for particles/verbs that never take an i'rab vowel. */
  invariant?: boolean;
}

/** Alif Lam Shamsiyya — the 14 letters that assimilate the definite lam. */
export const SUN_LETTERS: readonly string[] = [
  "ت",
  "ث",
  "د",
  "ذ",
  "ر",
  "ز",
  "س",
  "ش",
  "ص",
  "ض",
  "ط",
  "ظ",
  "ل",
  "ن",
];

/** Alif Lam Qamariyya — the 14 letters where the lam stays pronounced. */
export const MOON_LETTERS: readonly string[] = [
  "ء",
  "ا",
  "أ",
  "إ",
  "آ",
  "ب",
  "ج",
  "ح",
  "خ",
  "ع",
  "غ",
  "ف",
  "ق",
  "ك",
  "م",
  "ه",
  "و",
  "ي",
];

export const SUN_LETTER_SET: ReadonlySet<string> = new Set(SUN_LETTERS);
export const MOON_LETTER_SET: ReadonlySet<string> = new Set(MOON_LETTERS);

/** Multi-word fixed formulae, matched before per-word rules. */
export interface FixedPhrase {
  bare: string;
  full: string;
}

export const FIXED_PHRASES: readonly FixedPhrase[] = [
  { bare: "بسم الله الرحمن الرحيم", full: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ" },
  { bare: "الحمد لله رب العالمين", full: "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ" },
  { bare: "الحمد لله", full: "الْحَمْدُ لِلَّهِ" },
  { bare: "الله أكبر", full: "اللَّهُ أَكْبَرُ" },
  { bare: "لا إله إلا الله", full: "لَا إِلَهَ إِلَّا اللَّهُ" },
  { bare: "سبحان الله", full: "سُبْحَانَ اللَّهِ" },
  { bare: "أستغفر الله", full: "أَسْتَغْفِرُ اللَّهَ" },
  {
    bare: "إنا لله وإنا إليه راجعون",
    full: "إِنَّا لِلَّهِ وَإِنَّا إِلَيْهِ رَاجِعُونَ",
  },
  { bare: "عليه الصلاة والسلام", full: "عَلَيْهِ الصَّلَاةُ وَالسَّلَامُ" },
  { bare: "صلى الله عليه وسلم", full: "صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ" },
  { bare: "محمد رسول الله", full: "مُحَمَّدٌ رَسُولُ اللَّهِ" },
  { bare: "وعليكم السلام", full: "وَعَلَيْكُمُ السَّلَامُ" },
  { bare: "جزاك الله خيرا", full: "جَزَاكَ اللَّهُ خَيْرًا" },
  { bare: "تبارك الله", full: "تَبَارَكَ اللَّهُ" },
  { bare: "لا حول ولا قوة إلا بالله", full: "لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ" },
  { bare: "إن الإنسان لفي خسر", full: "إِنَّ الْإِنْسَانَ لَفِي خُسْرٍ" },
];

/**
 * Single-word lexemes. Keys are bare (unvocalized) surface forms.
 */
export const LEXEMES: ReadonlyMap<string, Lexeme> = new Map<string, Lexeme>([
  // ── particles & pronouns (invariant, fully vocalized) ──
  ["من", { full: "مَنْ", invariant: true }],
  ["في", { full: "فِي", invariant: true }],
  ["على", { full: "عَلَى", invariant: true }],
  ["إلى", { full: "إِلَى", invariant: true }],
  ["عن", { full: "عَنْ", invariant: true }],
  ["حتى", { full: "حَتَّى", invariant: true }],
  ["قد", { full: "قَدْ", invariant: true }],
  ["لم", { full: "لَمْ", invariant: true }],
  ["لن", { full: "لَنْ", invariant: true }],
  ["هل", { full: "هَلْ", invariant: true }],
  ["ما", { full: "مَا", invariant: true }],
  ["لا", { full: "لَا", invariant: true }],
  ["أو", { full: "أَوْ", invariant: true }],
  ["ثم", { full: "ثُمَّ", invariant: true }],
  ["بل", { full: "بَلْ", invariant: true }],
  ["أن", { full: "أَنَّ", invariant: true }],
  ["إن", { full: "إِنَّ", invariant: true }],
  ["لكن", { full: "لٰكِنَّ", invariant: true }],
  ["لعل", { full: "لَعَلَّ", invariant: true }],
  ["كأن", { full: "كَأَنَّ", invariant: true }],
  ["ليت", { full: "لَيْتَ", invariant: true }],
  ["أما", { full: "أَمَّا", invariant: true }],
  ["إما", { full: "إِمَّا", invariant: true }],
  ["سوف", { full: "سَوْفَ", invariant: true }],
  ["نعم", { full: "نِعْمَ", invariant: true }],
  ["هو", { full: "هُوَ", invariant: true }],
  ["هي", { full: "هِيَ", invariant: true }],
  ["هم", { full: "هُمْ", invariant: true }],
  ["هن", { full: "هُنَّ", invariant: true }],
  ["نحن", { full: "نَحْنُ", invariant: true }],
  ["أنتم", { full: "أَنْتُمْ", invariant: true }],
  ["أنت", { full: "أَنْتَ", invariant: true }],
  ["هذا", { full: "هَذَا", invariant: true }],
  ["هذه", { full: "هَذِهِ", invariant: true }],
  ["ذلك", { full: "ذَلِكَ", invariant: true }],
  ["تلك", { full: "تِلْكَ", invariant: true }],
  ["أولئك", { full: "أُولَئِكَ", invariant: true }],
  ["هؤلاء", { full: "هَؤُلَاءِ", invariant: true }],
  ["الذي", { full: "الَّذِي", invariant: true }],
  ["التي", { full: "الَّتِي", invariant: true }],
  ["الذين", { full: "الَّذِينَ", invariant: true }],
  ["حيث", { full: "حَيْثُ", invariant: true }],
  ["بين", { full: "بَيْنَ", invariant: true }],
  ["مع", { full: "مَعَ", invariant: true }],
  ["عند", { full: "عِنْدَ", invariant: true }],
  ["لدى", { full: "لَدَى", invariant: true }],
  ["كل", { full: "كُلّ", invariant: true }],
  ["بعض", { full: "بَعْض", invariant: true }],

  // ── verbs (past forms are fixed; imperfect cores stop before the case) ──
  ["كان", { full: "كَانَ", invariant: true }],
  ["كانوا", { full: "كَانُوا", invariant: true }],
  ["قال", { full: "قَالَ", invariant: true }],
  ["قالوا", { full: "قَالُوا", invariant: true }],
  ["ليس", { full: "لَيْسَ", invariant: true }],
  ["أراد", { full: "أَرَادَ", invariant: true }],
  ["صلى", { full: "صَلَّى", invariant: true }],
  ["يكون", { full: "يَكُون" }],
  ["يقول", { full: "يَقُول" }],
  ["يريد", { full: "يُرِيد" }],
  ["يعمل", { full: "يَعْمَل" }],
  ["يعلم", { full: "يَعْلَم" }],
  ["يذهب", { full: "يَذْهَب" }],

  // ── noun cores (no final case vowel — the engine never guesses i'rab) ──
  ["الله", { full: "اللَّه" }],
  ["لله", { full: "لِلَّه" }],
  ["رب", { full: "رَبّ" }],
  ["رحمن", { full: "رَحْمَٰن" }],
  ["رحيم", { full: "رَحِيم" }],
  ["عالمين", { full: "عَالَمِينَ" }],
  ["كتاب", { full: "كِتَاب" }],
  ["بيت", { full: "بَيْت" }],
  ["بيوت", { full: "بُيُوت" }],
  ["مسجد", { full: "مَسْجِد" }],
  ["مساجد", { full: "مَسَاجِد" }],
  ["صلاة", { full: "صَلَاة" }],
  ["زكاة", { full: "زَكَاة" }],
  ["حج", { full: "حَجّ" }],
  ["إيمان", { full: "إِيمَان" }],
  ["إسلام", { full: "إِسْلَام" }],
  ["علم", { full: "عِلْم" }],
  ["عمل", { full: "عَمَل" }],
  ["يوم", { full: "يَوْم" }],
  ["أيام", { full: "أَيَّام" }],
  ["ليلة", { full: "لَيْلَة" }],
  ["نار", { full: "نَار" }],
  ["جنة", { full: "جَنَّة" }],
  ["ماء", { full: "مَاء" }],
  ["سماء", { full: "سَمَاء" }],
  ["أرض", { full: "أَرْض" }],
  ["شمس", { full: "شَمْس" }],
  ["قمر", { full: "قَمَر" }],
  ["بحر", { full: "بَحْر" }],
  ["باب", { full: "بَاب" }],
  ["دار", { full: "دَار" }],
  ["قلم", { full: "قَلَم" }],
  ["رجل", { full: "رَجُل" }],
  ["رجال", { full: "رِجَال" }],
  ["نبي", { full: "نَبِيّ" }],
  ["رسول", { full: "رَسُول" }],
  ["رسالة", { full: "رِسَالَة" }],
  ["محمد", { full: "مُحَمَّد" }],
  ["سلام", { full: "سَلَام" }],
  ["كبير", { full: "كَبِير" }],
  ["عصر", { full: "عَصْر" }],
  ["وقت", { full: "وَقْت" }],
  ["مكان", { full: "مَكَان" }],
  ["زمان", { full: "زَمَان" }],
  ["صغير", { full: "صَغِير" }],
  ["ناس", { full: "نَاس" }],
  ["دين", { full: "دِين" }],
  ["دنيا", { full: "دُنْيَا" }],
  ["حقيقة", { full: "حَقِيقَة" }],
  ["سؤال", { full: "سُؤَال" }],
  ["جواب", { full: "جَوَاب" }],
  ["كلام", { full: "كَلَام" }],
  ["كلمة", { full: "كَلِمَة" }],
  ["حفظ", { full: "حِفْظ" }],
  ["فهم", { full: "فَهْم" }],
  ["أدب", { full: "أَدَب" }],
  ["تاريخ", { full: "تَارِيخ" }],
  ["حياة", { full: "حَيَاة" }],
  ["أكبر", { full: "أَكْبَر" }],
]);

/** Proclitics the engine may strip before a lexeme, with their fixed vowel. */
export interface PrefixClitic {
  bare: string;
  vocalized: string;
  /** "any": safe before any found stem; "noun-al": only before a definite noun. */
  before: "any" | "noun";
}

export const CONJUNCTIONS: readonly PrefixClitic[] = [
  { bare: "و", vocalized: "وَ", before: "any" },
  { bare: "ف", vocalized: "فَ", before: "any" },
];

export const PREPOSITIONS: readonly PrefixClitic[] = [
  { bare: "ب", vocalized: "بِ", before: "any" },
  { bare: "ل", vocalized: "لِ", before: "noun" },
  { bare: "ك", vocalized: "كَ", before: "noun" },
];
