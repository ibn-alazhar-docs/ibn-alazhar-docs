import { ARABIC_LETTER_CLASS, TASHKEEL_SOURCE } from "../constants";
import type { DiacritizeOptions, DiacritizeResult, Diacritizer } from "./types";
import { DiacritizeError } from "./types";
import { isHeavilyVocalized, splitByProtectedSpans } from "./protected-spans";
import {
  CONJUNCTIONS,
  FIXED_PHRASES,
  LEXEMES,
  MOON_LETTER_SET,
  PREPOSITIONS,
  SUN_LETTER_SET,
} from "./lexicon";

/**
 * Deterministic, dependency-free diacritization engine.
 *
 * Strategy: table + derivational morphology, never letter-level guessing.
 * A word is vowelized only when (a) it appears verbatim in the curated
 * lexicon/phrase table, or (b) it decomposes into documented clitics
 * (waaw/feef/baa/laam/kaof + alif-lam shamsiyya/qamariyya) around a
 * lexicon entry. Everything else stays unvowelized and is counted in
 * `coverage` / `warnings`. On a religious-text platform a wrong haraka is
 * worse than a missing one, so the failure direction is under-promise.
 *
 * Pure functions over strings only — safe for the cloudflare-workers build
 * (no node builtins, no network, no fs).
 */

const FATHA = "\u064E";
const DAMMA = "\u064F";
const KASRA = "\u0650";
const SHADDA = "\u0651";
const SUKUN = "\u0652";
const TANWIN_MARKS = new Set(["\u064B", "\u064C", "\u064D"]);
const CASE_MARKS = new Set([FATHA, DAMMA, KASRA]);

const ARABIC_LETTER_ONE = new RegExp(ARABIC_LETTER_CLASS, "u");
const ARABIC_DIGIT = /[0-9\u0660-\u0669\u06F0-\u06F9]/;
const ARABIC_WORD_GLOBAL = new RegExp(`${ARABIC_LETTER_CLASS}+`, "gu");
const LETTER_OR_LATIN = new RegExp(`${ARABIC_LETTER_CLASS}|[A-Za-z]`, "u");
const TASHKEEL_TEST = new RegExp(`[${TASHKEEL_SOURCE}]`, "u");
const TASHKEEL_STRIP = new RegExp(`[${TASHKEEL_SOURCE}]|\u0640`, "g");
/** Sentence terminators that create a valid waqf position. */
const PAUSE_PUNCT = /[.!?;:\u061F\u06D4\u2026]/;

/** Lexical category, used to keep laam/kaof off verb stems. */
type PartOfSpeech = "noun" | "verb" | "particle";

interface WordResolution {
  diacritized: string;
  pos: PartOfSpeech;
}

// Bare forms in lexicon.ts whose listed value is a verb, not a noun.
const VERB_BARES: ReadonlySet<string> = new Set([
  "كان",
  "كانوا",
  "قال",
  "قالوا",
  "ليس",
  "أراد",
  "صلى",
  "يكون",
  "يقول",
  "يريد",
  "يعمل",
  "يعلم",
  "يذهب",
]);

interface PhraseEntry {
  fullWords: string[];
}

const PHRASE_BY_BARE: ReadonlyMap<string, PhraseEntry> = new Map<string, PhraseEntry>(
  FIXED_PHRASES.map((p): [string, PhraseEntry] => [
    p.bare,
    { fullWords: p.full.split(" ").map(normalizeMarkOrder) },
  ]),
);

const MAX_PHRASE_WORDS = FIXED_PHRASES.reduce((n, p) => Math.max(n, p.bare.split(" ").length), 1);

function stripMarks(word: string): string {
  return word.replace(TASHKEEL_STRIP, "");
}

/** Canonical combining order: shadda before its haraka (letter-shadda-vowel). */
function normalizeMarkOrder(s: string): string {
  return s.replace(/([َُِ])(ّ)/g, "$2$1");
}

/** Lexicon with normalized table values, built once per process. */
type NormalizedLexeme = { full: string; pause?: string; invariant?: boolean };
const NORM_LEXEMES: ReadonlyMap<string, NormalizedLexeme> = new Map<string, NormalizedLexeme>(
  [...LEXEMES].map(([bare, entry]): [string, NormalizedLexeme] => [
    bare,
    { ...entry, full: normalizeMarkOrder(entry.full) },
  ]),
);

function isMark(ch: string | undefined): ch is string {
  return ch !== undefined && TASHKEEL_TEST.test(ch);
}

/**
 * True consonantal letter. The canonical class (ARABIC_LETTER_RANGES) spans
 * whole blocks and therefore also matches tashkeel/Quranic marks and tatweel
 * — coverage must not count a haraka as an unvocalized "letter".
 */
function isLetter(ch: string | undefined): boolean {
  if (ch === undefined) return false;
  if (ch === "\u0640") return false; // tatweel is kashida, not a letter
  return ARABIC_LETTER_ONE.test(ch) && !isMark(ch) && !ARABIC_DIGIT.test(ch);
}

/**
 * Alif-Lam prefixing (ال شمسية / القمرية).
 * Sun letters: the written lam stays bare and the shadda moves onto the
 * sun letter (it already carries the assimilated lam), replacing its
 * opening haraka. Moon letters: the lam keeps its sukun, untouched body.
 */
export function applyDefiniteArticle(bodyBare: string, bodyFull: string): string | null {
  const first = [...bodyBare][0];
  if (!first) return null;

  if (SUN_LETTER_SET.has(first)) {
    const chars = [...bodyFull];
    const next = chars[1];
    if (next === SHADDA) return null; // unknown shadda-initial stem: refuse
    if (isMark(next) && !TANWIN_MARKS.has(next)) {
      chars[1] = SHADDA;
    } else {
      chars.splice(1, 0, SHADDA);
    }
    return "ال" + chars.join("");
  }

  if (MOON_LETTER_SET.has(first)) {
    return "الْ" + bodyFull;
  }
  return null;
}

/** Resolve a bare word against the lexicon (exact, then ال-derivation). */
function lookupExact(bare: string): WordResolution | null {
  const entry = NORM_LEXEMES.get(bare);
  if (!entry) return null;
  return { diacritized: entry.full, pos: VERB_BARES.has(bare) ? "verb" : "noun" };
}

/**
 * Resolve a bare word; null means "the engine does not know this form" —
 * the caller then leaves the word untouched (conservative mode).
 */
export function resolveWord(bare: string, depth = 2): WordResolution | null {
  const exact = lookupExact(bare);
  if (exact) return exact;

  if (bare.startsWith("ال") && bare.length > 3) {
    const body = bare.slice(2);
    const entry = NORM_LEXEMES.get(body);
    if (entry) {
      const formed = applyDefiniteArticle(body, entry.full);
      if (formed) return { diacritized: formed, pos: "noun" };
    }
  }

  if (depth > 0) {
    for (const conj of CONJUNCTIONS) {
      if (bare.startsWith(conj.bare) && bare.length > conj.bare.length + 1) {
        const rest = resolveWord(bare.slice(conj.bare.length), depth - 1);
        if (rest) return { diacritized: conj.vocalized + rest.diacritized, pos: rest.pos };
      }
    }
    for (const prep of PREPOSITIONS) {
      if (bare.startsWith(prep.bare) && bare.length > prep.bare.length + 1) {
        const remainder = bare.slice(prep.bare.length);
        const rest = resolveWord(remainder, depth - 1);
        if (!rest) continue;
        const definite = remainder.startsWith("ال");
        if (prep.before === "noun" && rest.pos !== "noun" && !definite) continue;
        return { diacritized: prep.vocalized + rest.diacritized, pos: rest.pos };
      }
    }
  }

  return null;
}

/**
 * Pausal form (waqf) of an engine-produced word. Only shapes with a
 * documented pausal reading are transformed: a fixed final vowel becomes a
 * sukun ("كَانَ" -> "كَانْ", "عَالَمِينَ" -> "عَالَمِينْ"), a caseless final
 * consonant takes a sukun ("كِتَاب" -> "كِتَابْ"), a bare taa marbuta takes
 * a sukun ("رَحْمَة" -> "رَحْمَةْ"). Tanwin endings and long-vowel letters
 * (ا/ى) are left untouched rather than guessed.
 */
export function toPauseForm(diacritized: string): string {
  const chars = [...diacritized];
  if (chars.length < 2) return diacritized;

  const last = chars[chars.length - 1];

  if (isMark(last)) {
    if (!CASE_MARKS.has(last)) return diacritized; // tanwin/other: conservative skip
    const letter = chars[chars.length - 2];
    if (!isLetter(letter)) return diacritized; // shadda/vowel directly before: conservative skip
    chars[chars.length - 1] = SUKUN;
    return chars.join("");
  }

  if (last === "\u0627" || last === "\u0649") return diacritized; // quiescent long vowel
  if (!isLetter(last)) return diacritized;
  return diacritized + SUKUN; // bare final letter (incl. taa marbuta): waqf sukun
}

/** True when the run of text after a word is only pause punctuation. */
function isWaqfSeparator(sep: string): boolean {
  if (!PAUSE_PUNCT.test(sep)) return false;
  return !LETTER_OR_LATIN.test(sep);
}

interface Token {
  word: string;
  start: number;
  end: number;
}

interface ChunkContext {
  skippedSamples: string[];
  skippedCount: number;
  warnLimit: number;
}

/** Vocalize one unprotected chunk, preserving every non-Arabic character. */
function processChunk(chunk: string, atTextEnd: boolean, ctx: ChunkContext): string {
  const tokens: Token[] = [];
  for (const match of chunk.matchAll(ARABIC_WORD_GLOBAL)) {
    if (match.index === undefined) continue;
    tokens.push({ word: match[0], start: match.index, end: match.index + match[0].length });
  }

  const pieces: string[] = [];
  let cursor = 0;
  let i = 0;

  while (i < tokens.length) {
    const token = tokens[i];
    if (!token) break;

    const phrase = matchPhrase(tokens, i, chunk, atTextEnd);
    if (phrase) {
      pieces.push(chunk.slice(cursor, token.start), ...phrase.emitted);
      cursor = phrase.end;
      i = phrase.nextToken;
      continue;
    }

    pieces.push(chunk.slice(cursor, token.start));
    const bare = stripMarks(token.word);

    if (token.word === bare && bare.length > 0) {
      const resolved = resolveWord(bare);
      if (resolved) {
        const next = tokens[i + 1];
        const sep = next ? chunk.slice(token.end, next.start) : chunk.slice(token.end);
        const atPause = next ? isWaqfSeparator(sep) : atTextEnd || isWaqfSeparator(sep);
        pieces.push(atPause ? toPauseForm(resolved.diacritized) : resolved.diacritized);
      } else {
        pieces.push(token.word);
        if ([...bare].some((ch) => isLetter(ch))) {
          ctx.skippedCount += 1;
          if (ctx.skippedSamples.length < ctx.warnLimit) ctx.skippedSamples.push(bare);
        }
      }
    } else {
      // Already carries tashkeel (or is a pure non-letter token): hands off.
      pieces.push(token.word);
    }

    cursor = token.end;
    i += 1;
  }
  pieces.push(chunk.slice(cursor));
  return pieces.join("");
}

/**
 * Longest-first fixed-phrase match starting at token index `i`. Phrase
 * output keeps the original inter-token separators; if the phrase closes a
 * sentence its last word is converted to pause form.
 */
function matchPhrase(
  tokens: Token[],
  i: number,
  chunk: string,
  atTextEnd: boolean,
): { emitted: string[]; end: number; nextToken: number } | null {
  for (let size = Math.min(MAX_PHRASE_WORDS, tokens.length - i); size >= 2; size -= 1) {
    const window = tokens.slice(i, i + size);
    const bareSeq = window.map((t) => stripMarks(t.word)).join(" ");
    const phrase = PHRASE_BY_BARE.get(bareSeq);
    if (!phrase || phrase.fullWords.length !== window.length) continue;

    const lastToken = window[window.length - 1];
    if (!lastToken) continue;

    const next = tokens[i + size];
    const trailing = chunk.slice(lastToken.end, next ? next.start : undefined);
    const atPause = next ? isWaqfSeparator(trailing) : atTextEnd || isWaqfSeparator(trailing);

    const emitted: string[] = [];
    let prev: Token | undefined;
    for (const [k, tok] of window.entries()) {
      if (prev) emitted.push(chunk.slice(prev.end, tok.start));
      const wordText = phrase.fullWords[k] ?? tok.word;
      emitted.push(k === window.length - 1 && atPause ? toPauseForm(wordText) : wordText);
      prev = tok;
    }
    return { emitted, end: lastToken.end, nextToken: i + size };
  }
  return null;
}

/**
 * Share of Arabic letters in `text` carrying at least one tashkeel mark
 * (0..1). Measured over the result, so already-vocalized protected spans
 * count toward the ratio the reader actually sees.
 */
export function computeCoverage(text: string): number {
  const chars = [...text];
  let letters = 0;
  let vocalized = 0;
  for (let i = 0; i < chars.length; i += 1) {
    if (!isLetter(chars[i])) continue;
    letters += 1;
    let j = i + 1;
    let hasMark = false;
    while (j < chars.length && isMark(chars[j])) {
      hasMark = true;
      j += 1;
    }
    if (hasMark) vocalized += 1;
  }
  return letters === 0 ? 0 : vocalized / letters;
}

export function deterministicDiacritize(
  input: string,
  opts?: Pick<DiacritizeOptions, "warnLimit">,
): DiacritizeResult {
  if (input.trim().length === 0) {
    throw new DiacritizeError("INPUT_EMPTY", "لا نص لتشكله");
  }

  const warnings: string[] = [];

  const segments = splitByProtectedSpans(input);
  // The ratio gate applies to the text we would actually touch; protected
  // (already-vocalized) spans must not freeze the whole document.
  const plainText = segments
    .filter((s) => !s.protected)
    .map((s) => s.text)
    .join(" ");
  if (isHeavilyVocalized(plainText)) {
    warnings.push("ALREADY_VOCALIZED");
    return { text: input, coverage: computeCoverage(input), engine: "deterministic", warnings };
  }
  const ctx: ChunkContext = {
    skippedSamples: [],
    skippedCount: 0,
    warnLimit: opts?.warnLimit ?? 20,
  };

  const lastChunkIndex = segments.reduce(
    (last, segment, index) => (segment.protected ? last : index),
    -1,
  );
  const output = segments
    .map((segment, index) =>
      segment.protected ? segment.text : processChunk(segment.text, index === lastChunkIndex, ctx),
    )
    .join("");

  const protectedCount = segments.filter((s) => s.protected).length;
  if (protectedCount > 0) warnings.push(`PROTECTED_SPAN_PASSTHROUGH:${protectedCount}`);
  if (ctx.skippedCount > 0) {
    warnings.push(`UNVOWELIZED_COUNT:${ctx.skippedCount}`);
    for (const sample of ctx.skippedSamples) warnings.push(`UNVOWELIZED_WORD:${sample}`);
  }
  if (computeCoverage(input) === 0 && (output.match(ARABIC_WORD_GLOBAL) ?? []).length === 0) {
    warnings.push("NON_ARABIC_PASSTHROUGH");
  }

  return { text: output, coverage: computeCoverage(output), engine: "deterministic", warnings };
}

/** Diacritizer facade over the deterministic engine (always available). */
export const deterministicDiacritizer: Diacritizer = {
  id: "deterministic",
  async diacritize(text: string, opts?: DiacritizeOptions): Promise<DiacritizeResult> {
    return deterministicDiacritize(text, opts);
  },
};
