/**
 * index.ts — الواجهة العامة لحزمة pipeline (barrel فقط).
 *
 * إعادة تصدير الوحدات العامة دون إضافة منطق؛ لا تُغيَّر قائمة الصادرات هنا
 * إلا بقرار صريح لأن المستهلكين الخارجيين يعتمدون على هذه الأسماء.
 */

export * from "./types";
export * from "./config";
export type { Job } from "bullmq";
export * from "./storage";
export * from "./audit/vault";
export * from "./queue";
export * from "./ocr";
export * from "./keypool";
export * from "./qa-gates";
export * from "./verify-quotes";
export * from "./booklet";
export * from "./clean-structure";
export * from "./book-factory";
export * from "./ocr-provider";
export * from "./ocr-chain";
export * from "./text";
export * from "./ir";
export * from "./output";
export * from "./google-drive";
export * from "./document-router";

import "dotenv/config";
