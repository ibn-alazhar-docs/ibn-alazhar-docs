// واجهة IR: المُحوِّل (gemini-ir-converter) فوق الأساس (converter-base)
// والأدوات (utils) وكاشفات البنية (detection/*). الأسماء كما هي.
export * from "./gemini-ir-converter";
export * from "./converter-base";
export * from "./utils";
export * from "./detection/heading-detector";
export * from "./detection/list-detector";
export * from "./detection/paragraph-detector";
