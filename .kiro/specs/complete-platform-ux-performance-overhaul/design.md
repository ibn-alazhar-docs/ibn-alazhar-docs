# Design Document: Complete Platform UX & Performance Overhaul

## Overview

This design addresses critical UX and performance issues in the Ibn Al-Azhar document processing platform. The core problem is that exported documents lose all formatting (headings, lists, structure) despite the OCR preview displaying beautiful formatting. Additionally, the platform suffers from poor mobile experience, non-sticky export controls, and performance degradation.

### Solution Summary

The solution implements a **two-phase export pipeline architecture**:

1. **Phase 1: OCR → Intermediate Representation (IR)** - Extract semantic document structure
2. **Phase 2: IR → Format Generators** - Convert IR to DOCX, PDF, Markdown, TXT, JSON

Combined with:
- **Enhanced OCR structure detection** using Gemini's layout analysis
- **Sticky export header** with CSS position:sticky
- **Floating action button (FAB)** for quick export access
- **Redesigned export dialog** using shadcn/ui
- **Performance optimizations** (code splitting, lazy loading, image optimization)
- **Mobile-first responsive design** with RTL support

### Key Design Decisions

1. **Intermediate Representation (IR)**: Decouple structure detection from format generation for maintainability
2. **Gemini OCR Enhancement**: Leverage Gemini's native layout analysis instead of building custom detection
3. **CSS position:sticky**: Simple, performant sticky header without JavaScript
4. **shadcn/ui Dialog**: Consistent with existing design system
5. **Next.js App Router optimizations**: Leverage streaming SSR and React Server Components
6. **Progressive enhancement**: Mobile-first, works without JavaScript for core features

---

## Architecture

### System Context Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Browser                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Next.js App (apps/web)                                   │  │
│  │  ┌─────────────────┐  ┌──────────────────┐              │  │
│  │  │ Document Preview │  │  Export Dialog   │              │  │
│  │  │  - Sticky Header │  │  (shadcn/ui)     │              │  │
│  │  │  - FAB Button    │  │  - Format Cards  │              │  │
│  │  └─────────────────┘  └──────────────────┘              │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────┬───────────────────────────────────────┘
                          │ API Calls
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Export Pipeline (packages/pipeline)          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Phase 1: OCR → IR Converter                             │  │
│  │  ┌────────────────┐          ┌──────────────────────┐   │  │
│  │  │ Gemini OCR     │  ──────→ │  IR Generator        │   │  │
│  │  │ Layout Analysis│          │  (semantic structure)│   │  │
│  │  └────────────────┘          └──────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                          │                                      │
│                          ▼ IR (JSON)                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Phase 2: IR → Format Generators                         │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │  │
│  │  │  DOCX    │  │   PDF    │  │ Markdown │  │  JSON   │ │  │
│  │  │Generator │  │Generator │  │Generator │  │Generator│ │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
1. User uploads document → OCR processing (Gemini)
2. Gemini returns text + layout metadata
3. IR Generator parses layout → creates IR tree
4. IR stored in database alongside OCR results
5. User clicks export → Format Generator reads IR
6. Generator produces formatted output (DOCX/PDF/etc)
7. File returned to user with preserved structure
```

---

## Components and Interfaces

### 1. Intermediate Representation (IR) Data Structure

The IR is a JSON-serializable tree structure representing document semantics.

#### IR Type Definitions

```typescript
// packages/shared/src/types/document-ir.ts

/**
 * Intermediate Representation for document structure
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
export type BlockNode =
  | HeadingNode
  | ParagraphNode
  | ListNode
  | CodeBlockNode;

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
```

#### IR Example

```json
{
  "version": "1.0",
  "metadata": {
    "ocrProvider": "gemini",
    "pageCount": 1,
    "language": "ar",
    "confidence": 0.95,
    "processedAt": "2024-01-15T10:30:00Z"
  },
  "content": [
    {
      "type": "heading",
      "level": 1,
      "content": [
        { "type": "text", "content": "عنوان الوثيقة", "emphasis": { "bold": true } }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "content": "هذه فقرة عادية مع " },
        { "type": "text", "content": "نص مهم", "emphasis": { "bold": true } },
        { "type": "text", "content": " في المنتصف." }
      ]
    },
    {
      "type": "list",
      "ordered": false,
      "items": [
        {
          "content": [{ "type": "text", "content": "العنصر الأول" }]
        },
        {
          "content": [{ "type": "text", "content": "العنصر الثاني" }]
        }
      ]
    }
  ]
}
```

---

### 2. OCR Structure Detection

#### Current State Analysis

The existing Gemini OCR integration (`packages/pipeline/src/ocr-providers/gemini-ocr.ts`) currently:
- Extracts text content only
- Returns plain text with minimal structure
- Discards layout metadata from Gemini API response

#### Enhancement Strategy

**Gemini Vision API** already provides rich layout analysis in its response. We need to:

1. **Parse Gemini's layout annotations** instead of building custom detection
2. **Extract bounding box data** for text blocks
3. **Analyze spatial relationships** (indentation, alignment, proximity)
4. **Detect patterns** (numbering sequences, bullet characters)

#### Detection Heuristics

**Heading Detection:**
```
IF fontSize > avgFontSize * 1.3 OR fontWeight > 600:
  Classify as heading
  Level = map(fontSize, [minHeading, maxHeading], [6, 1])
```

**List Detection:**
```
IF line starts with [•, -, *, ○, ▪, 1., 2., أ., ب.]:
  Classify as list item
  Determine list type (ordered/unordered)
  Detect nesting level by indentation
```

**Paragraph Detection:**
```
Group consecutive lines with:
  - Similar left alignment
  - Similar font properties
  - No list markers
  - Vertical spacing < threshold
```

#### Implementation Component

```typescript
// packages/pipeline/src/ir/gemini-ir-converter.ts

export class GeminiIRConverter {
  /**
   * Convert Gemini OCR output to IR
   */
  convert(geminiResponse: GeminiOCRResponse): DocumentIR {
    const blocks = this.parseBlocks(geminiResponse.textAnnotations);
    const structuredBlocks = this.detectStructure(blocks);
    return {
      version: "1.0",
      metadata: this.extractMetadata(geminiResponse),
      content: structuredBlocks,
    };
  }

  private detectStructure(blocks: RawBlock[]): BlockNode[] {
    const result: BlockNode[] = [];
    let i = 0;

    while (i < blocks.length) {
      const block = blocks[i];

      // Try heading detection
      if (this.isHeading(block)) {
        result.push(this.createHeading(block));
        i++;
        continue;
      }

      // Try list detection
      if (this.isListStart(block)) {
        const listNode = this.parseList(blocks, i);
        result.push(listNode.node);
        i = listNode.nextIndex;
        continue;
      }

      // Default: paragraph
      result.push(this.createParagraph(block));
      i++;
    }

    return result;
  }

  private isHeading(block: RawBlock): boolean {
    const avgFontSize = this.calculateAvgFontSize();
    return (
      block.fontSize > avgFontSize * 1.3 ||
      block.fontWeight > 600
    );
  }

  private isListStart(block: RawBlock): boolean {
    const listMarkers = /^[•\-*○▪]|\d+\.|[أ-ي]\./;
    return listMarkers.test(block.text.trim());
  }

  private parseList(blocks: RawBlock[], startIndex: number): {
    node: ListNode;
    nextIndex: number;
  } {
    const items: ListItemNode[] = [];
    const firstBlock = blocks[startIndex];
    const ordered = /^\d+\.|[أ-ي]\./.test(firstBlock.text.trim());
    
    let i = startIndex;
    const baseIndent = firstBlock.indentation;

    while (i < blocks.length) {
      const block = blocks[i];
      
      // Stop if indentation decreased (end of list)
      if (block.indentation < baseIndent) break;
      
      // Stop if not a list item
      if (!this.isListStart(block)) break;

      items.push({
        content: this.parseInlineContent(block.text),
      });
      
      i++;
    }

    return {
      node: { type: "list", ordered, items },
      nextIndex: i,
    };
  }
}
```

---

### 3. Export Pipeline Refactor

#### Current State

Existing export generators (`packages/pipeline/src/output/`):
- Directly read OCR plain text
- No structure awareness
- Each generator duplicates detection logic
- Hard to maintain and extend

#### New Architecture

```
┌────────────────────────────────────────────┐
│  OCR Result (Gemini/Tesseract)            │
└──────────────────┬─────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────┐
│  IR Converter                              │
│  - Parse layout metadata                   │
│  - Detect structure                        │
│  - Build IR tree                           │
└──────────────────┬─────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────┐
│  Intermediate Representation (IR)          │
│  - JSON stored in database                 │
│  - Single source of truth                  │
└──────────────────┬─────────────────────────┘
                   │
        ┌──────────┴──────────┬──────────┬───────────┐
        ▼                     ▼          ▼           ▼
  ┌──────────┐         ┌──────────┐  ┌────────┐  ┌─────┐
  │  DOCX    │         │   PDF    │  │  MD    │  │ TXT │
  │Generator │         │Generator │  │Generator  │ JSON│
  └──────────┘         └──────────┘  └────────┘  └─────┘
```

#### Generator Interface

```typescript
// packages/pipeline/src/output/generator-base.ts

export interface FormatGenerator {
  /**
   * Generate output from IR
   */
  generate(ir: DocumentIR, options?: GeneratorOptions): Promise<Buffer>;
  
  /**
   * Get MIME type for this format
   */
  getMimeType(): string;
  
  /**
   * Get file extension
   */
  getExtension(): string;
}

export interface GeneratorOptions {
  fileName?: string;
  metadata?: Record<string, unknown>;
  // Format-specific options
  [key: string]: unknown;
}
```

#### DOCX Generator

```typescript
// packages/pipeline/src/output/docx-generator.ts
import { Document, Paragraph, TextRun, HeadingLevel } from "docx";

export class DOCXGenerator implements FormatGenerator {
  async generate(ir: DocumentIR): Promise<Buffer> {
    const sections = this.convertIRToDocx(ir.content);
    
    const doc = new Document({
      sections: [{
        properties: {},
        children: sections,
      }],
    });

    return await Packer.toBuffer(doc);
  }

  private convertIRToDocx(blocks: BlockNode[]): Paragraph[] {
    return blocks.flatMap(block => {
      switch (block.type) {
        case "heading":
          return this.createHeading(block);
        case "paragraph":
          return this.createParagraph(block);
        case "list":
          return this.createList(block);
        default:
          return [];
      }
    });
  }

  private createHeading(node: HeadingNode): Paragraph {
    const level = `Heading${node.level}` as HeadingLevel;
    return new Paragraph({
      text: this.extractPlainText(node.content),
      heading: level,
      bidirectional: true, // RTL support
    });
  }

  private createParagraph(node: ParagraphNode): Paragraph {
    return new Paragraph({
      children: node.content.map(inline => this.createTextRun(inline)),
      bidirectional: true,
    });
  }

  private createTextRun(node: InlineNode): TextRun {
    if (node.type === "line-break") {
      return new TextRun({ break: 1 });
    }

    return new TextRun({
      text: node.content,
      bold: node.emphasis?.bold,
      italics: node.emphasis?.italic,
      underline: node.emphasis?.underline ? {} : undefined,
    });
  }

  private createList(node: ListNode): Paragraph[] {
    return node.items.map((item, index) =>
      new Paragraph({
        children: item.content.map(inline => this.createTextRun(inline)),
        numbering: {
          reference: "default-numbering",
          level: 0,
        },
        bidirectional: true,
      })
    );
  }

  getMimeType(): string {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }

  getExtension(): string {
    return ".docx";
  }
}
```

#### Markdown Generator

```typescript
// packages/pipeline/src/output/markdown-generator.ts

export class MarkdownGenerator implements FormatGenerator {
  async generate(ir: DocumentIR): Promise<Buffer> {
    const markdown = this.convertIRToMarkdown(ir.content);
    return Buffer.from(markdown, "utf-8");
  }

  private convertIRToMarkdown(blocks: BlockNode[]): string {
    return blocks.map(block => {
      switch (block.type) {
        case "heading":
          return this.createHeading(block);
        case "paragraph":
          return this.createParagraph(block);
        case "list":
          return this.createList(block);
        default:
          return "";
      }
    }).join("\n\n");
  }

  private createHeading(node: HeadingNode): string {
    const prefix = "#".repeat(node.level);
    const text = this.inlineToMarkdown(node.content);
    return `${prefix} ${text}`;
  }

  private createParagraph(node: ParagraphNode): string {
    return this.inlineToMarkdown(node.content);
  }

  private createList(node: ListNode): string {
    return node.items.map((item, index) => {
      const marker = node.ordered ? `${index + 1}.` : "-";
      const text = this.inlineToMarkdown(item.content);
      return `${marker} ${text}`;
    }).join("\n");
  }

  private inlineToMarkdown(nodes: InlineNode[]): string {
    return nodes.map(node => {
      if (node.type === "line-break") return "  \n";
      
      let text = node.content;
      if (node.emphasis?.bold) text = `**${text}**`;
      if (node.emphasis?.italic) text = `*${text}*`;
      return text;
    }).join("");
  }

  getMimeType(): string {
    return "text/markdown";
  }

  getExtension(): string {
    return ".md";
  }
}
```

#### PDF Generator (via Pandoc)

```typescript
// packages/pipeline/src/output/pdf-generator.ts
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export class PDFGenerator implements FormatGenerator {
  async generate(ir: DocumentIR): Promise<Buffer> {
    // Generate Markdown first
    const mdGenerator = new MarkdownGenerator();
    const markdown = await mdGenerator.generate(ir);
    
    // Convert Markdown to PDF via Pandoc
    const tempMd = `/tmp/doc-${Date.now()}.md`;
    const tempPdf = `/tmp/doc-${Date.now()}.pdf`;
    
    await fs.promises.writeFile(tempMd, markdown);
    
    await execAsync(
      `pandoc ${tempMd} -o ${tempPdf} --pdf-engine=xelatex -V mainfont="Arial" -V lang=ar`
    );
    
    const pdf = await fs.promises.readFile(tempPdf);
    
    // Cleanup
    await fs.promises.unlink(tempMd);
    await fs.promises.unlink(tempPdf);
    
    return pdf;
  }

  getMimeType(): string {
    return "application/pdf";
  }

  getExtension(): string {
    return ".pdf";
  }
}
```

---

### 4. UI Components

#### Sticky Export Header

**Component Location:** `apps/web/src/components/document/export-header.tsx`

**Implementation Strategy:**
- Use CSS `position: sticky` (no JavaScript needed)
- Apply z-index layering (header > content)
- Mobile-responsive breakpoints
- RTL layout support

**Component Structure:**

```tsx
// apps/web/src/components/document/export-header.tsx

export function ExportHeader({ documentId }: { documentId: string }) {
  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/documents">
              <ArrowRight className="h-5 w-5" /> {/* RTL: ArrowRight points left */}
            </Link>
          </Button>
          <h1 className="text-lg font-semibold truncate">
            معاينة الوثيقة
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
          >
            <Download className="h-4 w-4 ms-2" />
            تصدير
          </Button>
        </div>
      </div>
    </header>
  );
}
```

**CSS Requirements:**

```css
/* Ensure sticky works correctly */
.sticky {
  position: sticky;
  top: 0;
  z-index: 40;
}

/* Backdrop blur for semi-transparency */
.backdrop-blur {
  backdrop-filter: blur(8px);
}

/* Mobile adjustments */
@media (max-width: 768px) {
  .export-header {
    padding: 0.5rem;
  }
  
  .export-header h1 {
    font-size: 1rem;
  }
}
```

#### Floating Action Button (FAB)

**Component Location:** `apps/web/src/components/document/export-fab.tsx`

**Design Specifications:**
- **Position:** Fixed bottom-left (RTL: bottom-left is thumb zone)
- **Size:** 56x56px (mobile), 64x64px (desktop)
- **Color:** Primary theme color with elevation shadow
- **Icon:** Download/Export icon
- **Animation:** Scale-in on mount, bounce on scroll stop

**Component Structure:**

```tsx
// apps/web/src/components/document/export-fab.tsx
"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExportDialog } from "./export-dialog";

export function ExportFAB({ documentId }: { documentId: string }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <Button
        size="icon"
        className="fixed bottom-6 start-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 z-30"
        onClick={() => setIsDialogOpen(true)}
        aria-label="تصدير الوثيقة"
      >
        <Download className="h-6 w-6" />
      </Button>

      <ExportDialog
        documentId={documentId}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </>
  );
}
```

**CSS for RTL and Mobile:**

```css
/* RTL: bottom-left is thumb zone */
[dir="rtl"] .fixed.start-6 {
  left: 1.5rem;
  right: auto;
}

/* Mobile optimization */
@media (max-width: 768px) {
  .export-fab {
    width: 56px;
    height: 56px;
    bottom: 1rem;
    left: 1rem; /* RTL */
  }
}

/* Prevent FAB overlap with mobile keyboard */
@media (max-width: 768px) and (max-height: 500px) {
  .export-fab {
    display: none;
  }
}
```

#### Export Dialog Redesign

**Component Location:** `apps/web/src/components/document/export-dialog.tsx`

**Design Requirements:**
- Use shadcn/ui Dialog component
- Format selection as cards (not dropdown)
- Visual format preview icons
- Loading states with progress
- Success/error inline feedback
- Mobile-responsive (full-width on mobile)

**Component Structure:**

```tsx
// apps/web/src/components/document/export-dialog.tsx
"use client";

import { useState } from "react";
import { FileText, FileType, FileJson, Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

type ExportFormat = "docx" | "pdf" | "markdown" | "txt" | "json";

interface ExportDialogProps {
  documentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportDialog({
  documentId,
  open,
  onOpenChange,
}: ExportDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const formats: Array<{
    id: ExportFormat;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    {
      id: "docx",
      label: "Word (DOCX)",
      description: "مع الحفاظ على التنسيق الكامل",
      icon: FileText,
    },
    {
      id: "pdf",
      label: "PDF",
      description: "للطباعة والمشاركة",
      icon: FileType,
    },
    {
      id: "markdown",
      label: "Markdown",
      description: "للتحرير والنشر",
      icon: FileText,
    },
    {
      id: "txt",
      label: "نص عادي (TXT)",
      description: "بدون تنسيق",
      icon: FileText,
    },
    {
      id: "json",
      label: "JSON",
      description: "البيانات والبنية الكاملة",
      icon: FileJson,
    },
  ];

  const handleExport = async () => {
    if (!selectedFormat) return;

    setIsExporting(true);
    setProgress(0);

    try {
      // Simulate progress (real implementation would track actual progress)
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch(`/api/documents/${documentId}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: selectedFormat }),
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!response.ok) throw new Error("Export failed");

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `document.${selectedFormat}`;
      a.click();
      window.URL.revokeObjectURL(url);

      // Close dialog after success
      setTimeout(() => onOpenChange(false), 500);
    } catch (error) {
      console.error("Export error:", error);
      alert("فشل التصدير. يرجى المحاولة مرة أخرى.");
    } finally {
      setIsExporting(false);
      setProgress(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>تصدير الوثيقة</DialogTitle>
          <DialogDescription>
            اختر تنسيق التصدير المناسب
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-4">
          {formats.map((format) => {
            const Icon = format.icon;
            const isSelected = selectedFormat === format.id;

            return (
              <button
                key={format.id}
                onClick={() => setSelectedFormat(format.id)}
                disabled={isExporting}
                className={`
                  flex flex-col items-start gap-2 p-4 rounded-lg border-2 transition-all
                  hover:shadow-md hover:scale-[1.02]
                  ${isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                  }
                  ${isExporting ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                `}
              >
                <Icon className="h-6 w-6 text-primary" />
                <div className="text-right w-full">
                  <div className="font-semibold">{format.label}</div>
                  <div className="text-sm text-muted-foreground">
                    {format.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {isExporting && (
          <div className="space-y-2">
            <Progress value={progress} />
            <p className="text-sm text-center text-muted-foreground">
              جاري التصدير... {progress}%
            </p>
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isExporting}
          >
            إلغاء
          </Button>
          <Button
            onClick={handleExport}
            disabled={!selectedFormat || isExporting}
          >
            <Download className="h-4 w-4 ms-2" />
            تصدير
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Data Models

### Database Schema Changes

**Add IR storage to documents table:**

```prisma
// packages/database/prisma/schema.prisma

model Document {
  id              String   @id @default(cuid())
  userId          String
  fileName        String
  fileUrl         String
  status          DocumentStatus
  ocrText         String?  @db.Text
  ocrData         Json?    // Raw OCR provider response
  
  // NEW: Intermediate Representation
  documentIR      Json?    // Stores DocumentIR structure
  irVersion       String?  // IR schema version (e.g., "1.0")
  irGeneratedAt   DateTime?
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  deletedAt       DateTime?
  
  user            User     @relation(fields: [userId], references: [id])
  
  @@index([userId])
  @@index([status])
  @@index([createdAt])
}
```

**Migration Strategy:**
1. Add nullable `documentIR`, `irVersion`, `irGeneratedAt` columns
2. Backfill existing documents with IR generation job (async)
3. Make `documentIR` required in future migration after backfill complete

---

## Performance Optimization Strategy

### 1. Bundle Analysis and Code Splitting

**Current State Issues:**
- Large initial bundle size
- All pages loaded upfront
- Unused code shipped to client

**Solutions:**

**Next.js App Router Dynamic Imports:**

```tsx
// apps/web/src/app/documents/[id]/page.tsx
import dynamic from "next/dynamic";

// Lazy load heavy components
const ExportDialog = dynamic(() => import("@/components/document/export-dialog"), {
  loading: () => <Skeleton className="h-96" />,
});

const DocumentPreview = dynamic(() => import("@/components/document/preview"), {
  ssr: true, // SSR for SEO and LCP
});
```

**Route-based Code Splitting:**
- Next.js automatically splits by route
- Each page (`/upload`, `/documents`, `/documents/[id]`) gets own chunk
- Shared components extracted to common chunk

**Bundle Analysis Commands:**

```bash
# Add to package.json scripts
"analyze": "ANALYZE=true pnpm build"

# Uses @next/bundle-analyzer
```

**Target Metrics:**
- Initial bundle: < 200KB gzipped
- Per-route chunks: < 100KB gzipped
- First Load JS: < 300KB gzipped

### 2. Image Optimization

**Current Issues:**
- Large PNG/JPEG files
- No responsive images
- No lazy loading

**Solutions:**

**Next.js Image Component:**

```tsx
import Image from "next/image";

<Image
  src={documentThumbnail}
  alt="Document preview"
  width={400}
  height={600}
  loading="lazy"
  placeholder="blur"
  blurDataURL={thumbnailPlaceholder}
/>
```

**Image Optimization Pipeline:**
1. Convert uploads to WebP (with JPEG fallback)

2. Generate responsive image sizes (thumbnail, medium, large)
3. Apply lazy loading for below-fold images
4. Use blur placeholders for better perceived performance

**Implementation:**

```typescript
// packages/pipeline/src/image/optimizer.ts
import sharp from "sharp";

export async function optimizeImage(buffer: Buffer): Promise<OptimizedImages> {
  const webp = await sharp(buffer)
    .webp({ quality: 80 })
    .toBuffer();

  const thumbnail = await sharp(buffer)
    .resize(200, 300, { fit: "cover" })
    .webp({ quality: 70 })
    .toBuffer();

  const blurPlaceholder = await sharp(buffer)
    .resize(20, 30, { fit: "cover" })
    .blur(10)
    .webp({ quality: 50 })
    .toBuffer();

  return {
    webp,
    thumbnail,
    blurPlaceholder: blurPlaceholder.toString("base64"),
  };
}
```

**Storage Strategy:**
- Store original + optimized variants in S3/storage
- Serve via CDN with proper cache headers
- Use `Cache-Control: public, max-age=31536000, immutable` for images


### 3. Caching Strategy

**Multi-Layer Caching Approach:**

#### Client-Side Caching

**Browser Cache:**
```typescript
// apps/web/src/app/api/documents/[id]/route.ts
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const document = await getDocument(params.id);

  return new Response(JSON.stringify(document), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "private, max-age=300", // 5 minutes
      "ETag": `W/"${document.updatedAt.getTime()}"`,
    },
  });
}
```

**React Query (TanStack Query):**
```typescript
// apps/web/src/hooks/use-document.ts
import { useQuery } from "@tanstack/react-query";

export function useDocument(id: string) {
  return useQuery({
    queryKey: ["document", id],
    queryFn: () => fetchDocument(id),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
}
```

#### Server-Side Caching

**Redis Cache for IR:**
```typescript
// packages/shared/src/cache/redis-client.ts
import Redis from "ioredis";

export const redis = new Redis(process.env.REDIS_URL);

export async function cacheDocumentIR(id: string, ir: DocumentIR) {
  await redis.setex(
    `document:ir:${id}`,
    3600, // 1 hour TTL
    JSON.stringify(ir)
  );
}

export async function getCachedDocumentIR(id: string): Promise<DocumentIR | null> {
  const cached = await redis.get(`document:ir:${id}`);
  return cached ? JSON.parse(cached) : null;
}
```


**CDN Caching:**
- Static assets (JS, CSS, images): `Cache-Control: public, max-age=31536000, immutable`
- API responses with ETags: `Cache-Control: private, max-age=300`
- Document exports: `Cache-Control: private, max-age=3600`

**Cache Invalidation Strategy:**
```typescript
// On document update
await redis.del(`document:ir:${documentId}`);
await redis.del(`document:export:${documentId}:*`); // Pattern deletion

// Invalidate React Query cache via optimistic updates
queryClient.invalidateQueries({ queryKey: ["document", documentId] });
```

### 4. Lazy Loading Strategy

**Component Lazy Loading:**

```tsx
// apps/web/src/app/documents/[id]/page.tsx
import dynamic from "next/dynamic";
import { Suspense } from "react";

const DocumentPreview = dynamic(() => import("@/components/document/preview"), {
  ssr: true,
  loading: () => <DocumentPreviewSkeleton />,
});

const ExportDialog = dynamic(() => import("@/components/document/export-dialog"), {
  ssr: false, // Client-only, not needed for initial render
});

const CommentsSidebar = dynamic(() => import("@/components/document/comments"), {
  ssr: false,
});

export default function DocumentPage({ params }: { params: { id: string } }) {
  return (
    <>
      <ExportHeader documentId={params.id} />
      <Suspense fallback={<DocumentPreviewSkeleton />}>
        <DocumentPreview documentId={params.id} />
      </Suspense>
      <ExportFAB documentId={params.id} />
    </>
  );
}
```


**Image Lazy Loading:**
```tsx
<Image
  src={documentPage}
  alt="Page preview"
  loading="lazy" // Native browser lazy loading
  decoding="async"
/>
```

**Intersection Observer for Custom Lazy Loading:**
```tsx
// apps/web/src/hooks/use-lazy-load.ts
import { useEffect, useRef, useState } from "react";

export function useLazyLoad<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "100px" } // Load 100px before entering viewport
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
}
```

**Usage:**
```tsx
export function DocumentPage({ page }: { page: PageData }) {
  const { ref, isVisible } = useLazyLoad<HTMLDivElement>();

  return (
    <div ref={ref}>
      {isVisible ? (
        <DocumentContent page={page} />
      ) : (
        <Skeleton className="h-96" />
      )}
    </div>
  );
}
```

---

## Mobile Responsive Design

### Breakpoint Strategy

**Tailwind CSS Breakpoints:**
```
- sm: 640px   (Mobile landscape)
- md: 768px   (Tablet portrait)
- lg: 1024px  (Tablet landscape)
- xl: 1280px  (Desktop)
- 2xl: 1536px (Large desktop)
```


### Mobile-First Component Patterns

**Responsive Export Header:**
```tsx
// Mobile: Compact header with icon-only buttons
// Desktop: Full labels and additional actions

<header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
  <div className="container flex h-14 md:h-16 items-center justify-between px-4">
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="icon" asChild>
        <Link href="/documents">
          <ArrowRight className="h-5 w-5" />
        </Link>
      </Button>
      <h1 className="text-base md:text-lg font-semibold truncate max-w-[150px] sm:max-w-none">
        معاينة الوثيقة
      </h1>
    </div>

    <div className="flex items-center gap-2">
      {/* Mobile: Icon only */}
      <Button variant="outline" size="sm" className="md:hidden" onClick={handleExport}>
        <Download className="h-4 w-4" />
      </Button>
      
      {/* Desktop: With label */}
      <Button variant="outline" size="sm" className="hidden md:flex" onClick={handleExport}>
        <Download className="h-4 w-4 ms-2" />
        تصدير
      </Button>
    </div>
  </div>
</header>
```

**Responsive Export Dialog:**
```tsx
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
    {/* Mobile: Single column, Desktop: Two columns */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-4">
      {formats.map((format) => (
        <FormatCard key={format.id} {...format} />
      ))}
    </div>
  </DialogContent>
</Dialog>
```


**Touch-Friendly FAB:**
```css
/* Minimum touch target: 48x48px (WCAG 2.5.5) */
.export-fab {
  width: 56px;
  height: 56px;
  /* Thumb zone for RTL: bottom-left */
  position: fixed;
  bottom: 1.5rem;
  left: 1.5rem; /* RTL */
}

/* Prevent FAB from blocking content */
.document-preview {
  padding-bottom: 6rem; /* Space for FAB */
}

/* Hide FAB when mobile keyboard is visible */
@media (max-height: 500px) {
  .export-fab {
    display: none;
  }
}
```

### RTL Layout Considerations

**Logical Properties (CSS):**
```css
/* Use logical properties instead of left/right */
.container {
  padding-inline-start: 1rem; /* Auto RTL/LTR */
  padding-inline-end: 1rem;
  margin-inline: auto;
}

/* Tailwind equivalents */
.ps-4  /* padding-inline-start */
.me-2  /* margin-inline-end */
.start-0  /* inset-inline-start */
```

**Icon Direction:**
```tsx
// Arrows should flip in RTL
import { ArrowRight, ArrowLeft } from "lucide-react";

// Use ArrowRight in RTL (it will point left visually)
<ArrowRight className="h-5 w-5" /> {/* Points left in RTL */}
```

**Tailwind RTL Plugin:**
```javascript
// tailwind.config.js
module.exports = {
  plugins: [
    require("tailwindcss-rtl"),
  ],
};
```

---

## Testing Strategy

### Unit Tests

**Test Coverage Requirements:**
- All IR converter functions
- Format generators (DOCX, PDF, Markdown)
- Document structure detection heuristics
- UI component rendering


**Example Unit Tests:**

```typescript
// packages/pipeline/tests/ir/gemini-ir-converter.test.ts
import { describe, it, expect } from "vitest";
import { GeminiIRConverter } from "@/ir/gemini-ir-converter";

describe("GeminiIRConverter", () => {
  const converter = new GeminiIRConverter();

  it("should detect headings by font size", () => {
    const input = {
      textAnnotations: [
        { text: "عنوان كبير", fontSize: 24, fontWeight: 700 },
      ],
    };
    const ir = converter.convert(input);
    expect(ir.content[0].type).toBe("heading");
    expect(ir.content[0].level).toBe(1);
  });

  it("should detect unordered lists", () => {
    const input = {
      textAnnotations: [
        { text: "• العنصر الأول", fontSize: 12 },
        { text: "• العنصر الثاني", fontSize: 12 },
      ],
    };
    const ir = converter.convert(input);
    expect(ir.content[0].type).toBe("list");
    expect(ir.content[0].ordered).toBe(false);
    expect(ir.content[0].items).toHaveLength(2);
  });

  it("should preserve bold emphasis", () => {
    const input = {
      textAnnotations: [
        { text: "نص عادي ", fontSize: 12 },
        { text: "نص عريض", fontSize: 12, fontWeight: 700 },
      ],
    };
    const ir = converter.convert(input);
    const paragraph = ir.content[0] as ParagraphNode;
    expect(paragraph.content[1].emphasis?.bold).toBe(true);
  });
});
```

```typescript
// packages/pipeline/tests/output/docx-generator.test.ts
import { describe, it, expect } from "vitest";
import { DOCXGenerator } from "@/output/docx-generator";

describe("DOCXGenerator", () => {
  const generator = new DOCXGenerator();

  it("should generate valid DOCX from IR", async () => {
    const ir: DocumentIR = {
      version: "1.0",
      metadata: { /* ... */ },
      content: [
        {
          type: "heading",
          level: 1,
          content: [{ type: "text", content: "عنوان" }],
        },
      ],
    };

    const buffer = await generator.generate(ir);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it("should preserve RTL text direction", async () => {
    // Test implementation would parse generated DOCX
    // and verify bidirectional property is set
  });
});
```


### Integration Tests

**Test Export Pipeline End-to-End:**

```typescript
// tests/integration/export-pipeline.test.ts
import { describe, it, expect } from "vitest";
import { OCRService } from "@/pipeline/ocr";
import { DOCXGenerator } from "@/pipeline/output";

describe("Export Pipeline Integration", () => {
  it("should export formatted DOCX from uploaded document", async () => {
    // 1. Upload document
    const file = await readTestFile("test-document.pdf");
    const document = await uploadDocument(file);

    // 2. Process OCR
    await processOCR(document.id);

    // 3. Export to DOCX
    const response = await fetch(`/api/documents/${document.id}/export`, {
      method: "POST",
      body: JSON.stringify({ format: "docx" }),
    });

    expect(response.ok).toBe(true);
    expect(response.headers.get("content-type")).toContain("wordprocessing");

    // 4. Verify DOCX structure
    const buffer = await response.arrayBuffer();
    const docx = await parseDocx(Buffer.from(buffer));
    expect(docx.paragraphs).toHaveLength(greaterThan(0));
  });
});
```

### E2E Tests (Playwright)

**Test User Workflows:**

```typescript
// tests/e2e/document-export.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Document Export", () => {
  test("should export document to DOCX with formatting", async ({ page }) => {
    // 1. Navigate to document
    await page.goto("/documents/test-doc-id");

    // 2. Sticky header should be visible
    const header = page.locator("header.sticky");
    await expect(header).toBeVisible();

    // 3. Click export button
    await page.getByRole("button", { name: /تصدير/ }).click();

    // 4. Export dialog should open
    const dialog = page.locator("[role=dialog]");
    await expect(dialog).toBeVisible();

    // 5. Select DOCX format
    await page.getByText("Word (DOCX)").click();

    // 6. Confirm export
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /تصدير/ }).last().click();

    // 7. Verify download
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.docx$/);
  });

  test("should show FAB on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    await page.goto("/documents/test-doc-id");

    const fab = page.locator(".export-fab");
    await expect(fab).toBeVisible();
  });

  test("should work on RTL layout", async ({ page }) => {
    await page.goto("/documents/test-doc-id");

    // Verify RTL direction
    const html = page.locator("html");
    await expect(html).toHaveAttribute("dir", "rtl");

    // Verify FAB is on left side (RTL thumb zone)
    const fab = page.locator(".export-fab");
    const box = await fab.boundingBox();
    expect(box?.x).toBeLessThan(100); // Left side of screen
  });
});
```


### Performance Tests

**Lighthouse CI Configuration:**

```json
// .lighthouserc.json
{
  "ci": {
    "collect": {
      "url": [
        "http://localhost:3000/documents/test-id"
      ],
      "numberOfRuns": 3
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 0.95 }],
        "first-contentful-paint": ["error", { "maxNumericValue": 2000 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        "total-blocking-time": ["error", { "maxNumericValue": 300 }]
      }
    }
  }
}
```

**Bundle Size Tests:**

```typescript
// tests/bundle-size.test.ts
import { describe, it, expect } from "vitest";
import { getClientBuildManifest } from "@/test-utils/bundle-analyzer";

describe("Bundle Size", () => {
  it("should keep initial bundle under 200KB", async () => {
    const manifest = await getClientBuildManifest();
    const initialSize = manifest.pages["/"].reduce(
      (sum, file) => sum + file.size,
      0
    );
    expect(initialSize).toBeLessThan(200 * 1024);
  });

  it("should code-split export dialog", async () => {
    const manifest = await getClientBuildManifest();
    const exportDialogChunk = manifest.chunks.find((chunk) =>
      chunk.name.includes("export-dialog")
    );
    expect(exportDialogChunk).toBeDefined();
  });
});
```

---

## Implementation Sequence

### Phase 1: Foundation (Week 1)

**Priority: Critical infrastructure**

1. **Database schema migration**
   - Add `documentIR`, `irVersion`, `irGeneratedAt` columns
   - Run migration on staging environment
   - _Requirements: 1.1_

2. **IR type definitions**
   - Create `DocumentIR` types in `packages/shared/`
   - Implement JSON schema validation
   - _Requirements: 1.1, 1.2_

3. **Gemini OCR enhancement**
   - Parse layout metadata from Gemini API
   - Extract bounding boxes and font properties
   - _Requirements: 1.3_


### Phase 2: IR Generation (Week 2)

**Priority: Core logic**

4. **IR Converter implementation**
   - Build `GeminiIRConverter` with structure detection
   - Implement heading detection heuristics
   - Implement list detection (ordered/unordered)
   - Implement paragraph grouping
   - _Requirements: 1.4, 1.5_

5. **IR generation integration**
   - Integrate converter into OCR pipeline
   - Store IR in database after OCR completion
   - _Requirements: 1.6_

6. **Unit tests for IR converter**
   - Test heading detection edge cases
   - Test list nesting scenarios
   - Test emphasis preservation
   - _Requirements: Testing all 1.x requirements_

### Phase 3: Export Generators (Week 3)

**Priority: User-facing formatting**

7. **DOCX generator**
   - Implement `DOCXGenerator` class
   - Support headings, paragraphs, lists
   - Preserve emphasis (bold, italic, underline)
   - Enable RTL text direction
   - _Requirements: 2.1, 2.2_

8. **Markdown generator**
   - Implement `MarkdownGenerator` class
   - Convert IR to GitHub Flavored Markdown
   - _Requirements: 2.3_

9. **PDF generator**
   - Implement PDF generation via Pandoc
   - Configure Arabic font support (XeLaTeX)
   - _Requirements: 2.4_

10. **Export API endpoint refactor**
    - Update `/api/documents/[id]/export` to use new generators
    - Support format selection (docx, pdf, markdown, txt, json)
    - _Requirements: 2.5_


### Phase 4: UI Components (Week 4)

**Priority: UX improvements**

11. **Sticky export header**
    - Build `ExportHeader` component with CSS sticky positioning
    - Implement responsive breakpoints
    - Test RTL layout
    - _Requirements: 3.1_

12. **Floating action button (FAB)**
    - Build `ExportFAB` component
    - Position in thumb zone (bottom-left for RTL)
    - Add scale animation
    - _Requirements: 3.2_

13. **Export dialog redesign**
    - Build `ExportDialog` with shadcn/ui Dialog
    - Implement format cards (not dropdown)
    - Add progress indicator
    - Mobile responsive (full-width on mobile)
    - _Requirements: 3.3, 3.4_

14. **Integration with export pipeline**
    - Wire dialog to export API
    - Handle loading states
    - Display success/error feedback
    - _Requirements: 3.5_

### Phase 5: Performance Optimization (Week 5)

**Priority: Speed and efficiency**

15. **Code splitting**
    - Dynamic import for export dialog
    - Route-based splitting verification
    - Bundle analysis with @next/bundle-analyzer
    - _Requirements: 4.1_

16. **Image optimization**
    - Implement WebP conversion with sharp
    - Generate responsive image sizes
    - Add blur placeholders
    - _Requirements: 4.2_

17. **Caching implementation**
    - Set up Redis cache for IR
    - Configure browser caching headers
    - Implement React Query for client cache
    - _Requirements: 4.3_

18. **Lazy loading**
    - Add lazy loading to images (native)
    - Implement Intersection Observer for custom components
    - Dynamic import heavy components
    - _Requirements: 4.4_


### Phase 6: Mobile Responsive & Testing (Week 6)

**Priority: Mobile experience and quality assurance**

19. **Mobile responsive refinements**
    - Test all breakpoints (mobile, tablet, desktop)
    - Verify RTL layout on all screen sizes
    - Touch-friendly UI adjustments (48px minimum targets)
    - _Requirements: 5.1, 5.2, 5.3_

20. **Integration testing**
    - Write end-to-end export pipeline tests
    - Test OCR → IR → Export flow
    - Verify format correctness
    - _Requirements: All functional requirements_

21. **E2E testing with Playwright**
    - Test export workflows
    - Test mobile FAB visibility
    - Test sticky header behavior
    - Test RTL layout
    - _Requirements: All UI requirements_

22. **Performance testing**
    - Run Lighthouse CI
    - Verify bundle sizes
    - Test loading performance
    - _Requirements: 4.x performance requirements_

23. **Accessibility audit**
    - WCAG 2.1 AA compliance check
    - Screen reader testing
    - Keyboard navigation verification
    - _Requirements: 3.x, 5.x UI requirements_

### Phase 7: Deployment & Monitoring (Week 7)

**Priority: Production readiness**

24. **Staging deployment**
    - Deploy to staging environment
    - Run full test suite
    - User acceptance testing (UAT)

25. **Production deployment**
    - Blue-green deployment strategy
    - Monitor error rates and performance
    - Gradual rollout with feature flags

26. **Post-deployment monitoring**
    - Set up alerts for export failures
    - Monitor bundle size regressions
    - Track Core Web Vitals in production

---

## Risk Assessment

### High Risks

**1. Gemini API Layout Metadata Availability**

**Risk:** Gemini API may not provide sufficient layout metadata for structure detection

**Mitigation:**
- Fallback to heuristic-based detection using bounding boxes
- Test with diverse document samples during development
- Implement confidence scoring to flag low-quality detections

**Contingency:** Use Tesseract with custom layout analysis if Gemini insufficient


**2. PDF Generation Dependency (Pandoc)**

**Risk:** Pandoc may not be available in production environment or may fail for complex documents

**Mitigation:**
- Containerize Pandoc with XeLaTeX in Docker image
- Test PDF generation early with production-like documents
- Implement retry logic with exponential backoff

**Contingency:** Use puppeteer/chromium for HTML → PDF conversion as fallback

**3. Performance Regression on Mobile**

**Risk:** Additional JavaScript for new UI components may slow mobile devices

**Mitigation:**
- Code splitting to defer non-critical JavaScript
- Measure performance with Lighthouse on low-end devices
- Use service worker for offline caching

**Contingency:** Implement progressive enhancement (core features work without JavaScript)

### Medium Risks

**4. IR Schema Evolution**

**Risk:** IR schema may need changes after deployment, breaking existing exports

**Mitigation:**
- Version IR schema (`version: "1.0"`)
- Implement schema migration utilities
- Maintain backward compatibility for at least one version

**5. Arabic RTL Layout Edge Cases**

**Risk:** RTL layout may break in unexpected ways across browsers/devices

**Mitigation:**
- Extensive cross-browser testing (Chrome, Firefox, Safari)
- Use logical CSS properties (`padding-inline-start` not `padding-left`)
- Test with Arabic content in all UI states

**6. Cache Invalidation Complexity**

**Risk:** Stale cached IR after document updates

**Mitigation:**
- Implement cache invalidation on document update
- Use versioned cache keys (include `updatedAt` timestamp)
- Set reasonable TTL (1 hour for IR, 5 minutes for API)

### Low Risks

**7. DOCX Library Limitations**

**Risk:** `docx` npm package may not support all formatting features

**Mitigation:**
- Test early with complex formatting scenarios
- Document unsupported features
- Fallback to Markdown export for unsupported features

---

## Success Metrics

### Performance Metrics

- **Largest Contentful Paint (LCP):** < 2.5s
- **First Input Delay (FID):** < 100ms
- **Cumulative Layout Shift (CLS):** < 0.1
- **Initial bundle size:** < 200KB gzipped
- **Export generation time:** < 5s for 10-page document

### Functionality Metrics

- **Structure detection accuracy:** > 90% for headings, lists, paragraphs
- **Export format preservation:** 100% of detected structure preserved in DOCX
- **Mobile responsiveness:** All features functional on viewport ≥ 375px
- **RTL layout correctness:** Zero layout breaks in Arabic content

### User Experience Metrics

- **Export dialog open time:** < 300ms
- **FAB visibility:** 100% on mobile viewports
- **Sticky header persistence:** 100% during scroll
- **Cross-browser compatibility:** Chrome, Firefox, Safari (latest 2 versions)

---

## Appendices

### A. IR Schema Versioning Strategy

**Version 1.0 (Initial):**
- Basic block types: heading, paragraph, list, code-block
- Inline emphasis: bold, italic, underline, strikethrough
- Support for ordered/unordered lists with nesting

**Future Versions:**
- **1.1:** Add table support
- **1.2:** Add image embedding with captions
- **2.0:** Add multi-column layout support

### B. Browser Support Matrix

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | Latest 2 | ✅ Full support |
| Firefox | Latest 2 | ✅ Full support |
| Safari | Latest 2 | ✅ Full support |
| Edge | Latest 2 | ✅ Full support |
| Mobile Safari | iOS 14+ | ✅ Full support |
| Chrome Mobile | Latest | ✅ Full support |

### C. Dependencies

**New Dependencies:**
- `docx` (^8.5.0) - DOCX generation
- `sharp` (^0.33.0) - Image optimization
- `ioredis` (^5.3.0) - Redis caching
- `@tanstack/react-query` (^5.0.0) - Client-side caching
- `zod` (^3.22.0) - IR schema validation

**System Dependencies:**
- Pandoc (^3.1) - PDF generation
- XeLaTeX - Arabic font support for PDF
- Redis (^7.0) - Caching layer

### D. Mobile Breakpoint Reference

**Primary Breakpoints:**
- **320px** - Small phones (iPhone SE 1st gen)
- **375px** - Standard phones (iPhone 12/13 mini)
- **768px** - Tablet portrait (iPad)
- **1024px** - Tablet landscape / Small desktop
- **1280px** - Desktop
- **1536px** - Large desktop

**Critical Touch Targets:**
- Minimum: 48x48px (WCAG 2.5.5)
- Recommended: 56x56px (Material Design)
- FAB: 56px mobile, 64px desktop

**Thumb Zones (RTL):**
- Primary: Bottom-left (natural thumb position for RTL users)
- Secondary: Top-right (for back navigation)
- Avoid: Top-left, Bottom-right (hard to reach)

---

## Conclusion

This design provides a comprehensive solution to the platform's UX and performance issues by:

1. **Preserving document structure** through a two-phase IR pipeline
2. **Improving mobile experience** with sticky header, FAB, and responsive design
3. **Optimizing performance** through code splitting, caching, and lazy loading
4. **Maintaining RTL-first design** with proper Arabic typography and layout

The phased implementation approach ensures incremental delivery of value while maintaining code quality through comprehensive testing at each stage.

