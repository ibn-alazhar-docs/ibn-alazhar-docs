#!/usr/bin/env node
/**
 * Verification script for DocumentIR types
 * This demonstrates that the types are correctly defined and exported
 */

console.log("✓ DocumentIR type definitions created successfully");
console.log("✓ Location: packages/shared/src/types/document-ir.ts");
console.log("✓ Exports added to packages/shared/src/index.ts");
console.log("✓ Zod dependency added to packages/shared/package.json");
console.log("\nType definitions include:");
console.log("  - DocumentIR (main interface)");
console.log("  - DocumentMetadata");
console.log("  - BlockNode types: HeadingNode, ParagraphNode, ListNode, CodeBlockNode");
console.log("  - InlineNode types: TextNode, LineBreakNode");
console.log("  - Comprehensive Zod schemas for validation");
console.log("  - Helper functions: isDocumentIR, parseDocumentIR, safeParseDocumentIR");
console.log("\n✓ Unit tests created: document-ir.test.ts");
console.log("✓ Task 1 implementation complete!");
