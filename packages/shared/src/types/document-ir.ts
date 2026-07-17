import { z } from "zod";

/**
 * Intermediate Representation for document structure
 * Version 1.0 - Initial implementation
 */
export interface DocumentIR {
  version: "1.0";
  metadata: DocumentMetadata;
  content: BlockNode[];
}

export interface DocumentMetadata {
  ocrProvider: "gemini" | "tesseract";
  pageCount: number;
  language: string; // ISO 639-1 code
  confidence: number; // 0-1
  processedAt: string; // ISO 8601 timestamp
}

/**
 * Block-level node (can contain inline nodes)
 */
export type BlockNode = HeadingNode | ParagraphNode | ListNode | CodeBlockNode;

export interface HeadingNode {
  type: "heading";
  level: 1 | 2 | 3 | 4 | 5 | 6;
  content: InlineNode[];
  id?: string; // For linking/TOC generation
}

export interface ParagraphNode {
  type: "paragraph";
  content: InlineNode[];
  alignment?: "left" | "center" | "right" | "justify";
}

export interface ListNode {
  type: "list";
  ordered: boolean;
  items: ListItemNode[];
  startNumber?: number; // For ordered lists
}

export interface ListItemNode {
  content: InlineNode[];
  children?: BlockNode[]; // Nested lists or paragraphs
}

export interface CodeBlockNode {
  type: "code-block";
  language?: string;
  content: string; // Plain text
}

/**
 * Inline-level node (text with styling)
 */
export type InlineNode = TextNode | LineBreakNode;

export interface TextNode {
  type: "text";
  content: string;
  emphasis?: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strikethrough?: boolean;
  };
  fontSize?: number; // For heading detection
  fontWeight?: number; // 100-900
}

export interface LineBreakNode {
  type: "line-break";
}

/**
 * Zod Schemas for runtime validation
 */

// Text emphasis schema
const emphasisSchema = z
  .object({
    bold: z.boolean().optional(),
    italic: z.boolean().optional(),
    underline: z.boolean().optional(),
    strikethrough: z.boolean().optional(),
  })
  .optional();

// Inline node schemas
const textNodeSchema: z.ZodType<TextNode> = z.object({
  type: z.literal("text"),
  content: z.string(),
  emphasis: emphasisSchema,
  fontSize: z.number().positive().optional(),
  fontWeight: z.number().min(100).max(900).optional(),
});

const lineBreakNodeSchema: z.ZodType<LineBreakNode> = z.object({
  type: z.literal("line-break"),
});

const inlineNodeSchema: z.ZodType<InlineNode> = z.discriminatedUnion("type", [
  textNodeSchema,
  lineBreakNodeSchema,
]);

// Block node schemas (with forward references for recursive types)
const headingNodeSchema: z.ZodType<HeadingNode> = z.object({
  type: z.literal("heading"),
  level: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
    z.literal(6),
  ]),
  content: z.array(inlineNodeSchema),
  id: z.string().optional(),
});

const paragraphNodeSchema: z.ZodType<ParagraphNode> = z.object({
  type: z.literal("paragraph"),
  content: z.array(inlineNodeSchema),
  alignment: z.enum(["left", "center", "right", "justify"]).optional(),
});

const codeBlockNodeSchema: z.ZodType<CodeBlockNode> = z.object({
  type: z.literal("code-block"),
  language: z.string().optional(),
  content: z.string(),
});

// List item schema with recursive block nodes
const listItemNodeSchema: z.ZodType<ListItemNode> = z.lazy(() =>
  z.object({
    content: z.array(inlineNodeSchema),
    children: z.array(blockNodeSchema).optional(),
  }),
);

const listNodeSchema: z.ZodType<ListNode> = z.object({
  type: z.literal("list"),
  ordered: z.boolean(),
  items: z.array(listItemNodeSchema),
  startNumber: z.number().int().positive().optional(),
});

// Combined block node schema
const blockNodeSchema: z.ZodType<BlockNode> = z.discriminatedUnion("type", [
  headingNodeSchema,
  paragraphNodeSchema,
  listNodeSchema,
  codeBlockNodeSchema,
]);

// Metadata schema
const documentMetadataSchema: z.ZodType<DocumentMetadata> = z.object({
  ocrProvider: z.enum(["gemini", "tesseract"]),
  pageCount: z.number().int().positive(),
  language: z.string().min(2).max(3), // ISO 639-1 or 639-2
  confidence: z.number().min(0).max(1),
  processedAt: z.string().datetime(), // ISO 8601 timestamp
});

// Complete DocumentIR schema
export const documentIRSchema: z.ZodType<DocumentIR> = z.object({
  version: z.literal("1.0"),
  metadata: documentMetadataSchema,
  content: z.array(blockNodeSchema),
});

/**
 * Type guard to check if an object is a valid DocumentIR
 */
export function isDocumentIR(obj: unknown): obj is DocumentIR {
  return documentIRSchema.safeParse(obj).success;
}

/**
 * Validate and parse a DocumentIR object
 * @throws {z.ZodError} if validation fails
 */
export function parseDocumentIR(obj: unknown): DocumentIR {
  return documentIRSchema.parse(obj);
}

/**
 * Safely parse a DocumentIR object
 * @returns {success: true, data: DocumentIR} | {success: false, error: z.ZodError}
 */
export function safeParseDocumentIR(obj: unknown): z.SafeParseReturnType<unknown, DocumentIR> {
  return documentIRSchema.safeParse(obj);
}
