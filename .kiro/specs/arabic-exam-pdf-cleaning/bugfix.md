# Bugfix Requirements Document

## Introduction

When users extract text from Arabic exam PDF files using the OCR pipeline, the output is severely corrupted. Question numbers like "س١" and "س5" disappear or become mangled, answer choices such as "(أ)" "(ب)" "(ج)" are deleted entirely, multiple questions merge into single lines, and the original exam formatting is completely lost. This makes the extracted text unusable for exam digitization workflows.

The root cause stems from aggressive text-cleaning operations in `cleanArabicText()` that were designed for general documents but break the structured layout of exams:
- `removeAsciiNoise()` strips Latin characters, breaking mixed Arabic/Latin markers
- `reconstructArabicLines()` merges short lines, combining separate questions
- `finalCleanup()` removes lines containing symbols, deleting answer choices
- `detectArabicHeadings()` converts question markers to markdown headings

Additionally, the OCR prompt in Gemini was not optimized for complex layouts like exams, tables, or multi-column documents, and there was no document-type detection to apply appropriate cleaning strategies.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the system processes an Arabic exam PDF with question numbers containing Latin characters (e.g., "س١", "س5") THEN `removeAsciiNoise()` strips the Latin characters causing question markers to disappear or become corrupted

1.2 WHEN the system processes an Arabic exam PDF with answer choices marked by symbols like "(أ)" "(ب)" "(ج)" "(د)" THEN `finalCleanup()` filters out lines containing high symbol ratios causing answer choices to be deleted from the output

1.3 WHEN the system processes an Arabic exam PDF with short question lines or answer stubs THEN `reconstructArabicLines()` merges consecutive short lines causing multiple questions to collapse into a single line

1.4 WHEN the system processes an Arabic exam PDF with question numbering patterns like "س١:" or "سؤال ٢:" THEN `detectArabicHeadings()` converts these markers to markdown headings causing incorrect formatting that breaks exam structure

1.5 WHEN the system processes an Arabic exam PDF THEN the Gemini OCR prompt does not provide specific instructions for preserving exam structure causing the model to fail to maintain question numbering, answer choices, and layout separation

1.6 WHEN the system processes any document type THEN the same aggressive cleaning options are applied regardless of content type causing exams, tables, and structured documents to lose their critical formatting

### Expected Behavior (Correct)

2.1 WHEN the system processes an Arabic exam PDF with question numbers containing Latin characters THEN the system SHALL preserve all mixed Arabic/Latin content without stripping characters

2.2 WHEN the system processes an Arabic exam PDF with answer choices marked by symbols THEN the system SHALL preserve lines containing answer choice patterns like "(أ)" "(ب)" "(ج)" "(د)" without deletion

2.3 WHEN the system processes an Arabic exam PDF with short question lines THEN the system SHALL keep each question and answer choice on separate lines without merging

2.4 WHEN the system processes an Arabic exam PDF with question numbering patterns THEN the system SHALL preserve the original question markers without converting them to markdown headings

2.5 WHEN the system processes an Arabic exam PDF THEN the Gemini OCR prompt SHALL include explicit instructions to preserve question formatting, answer choices in separate lines, and table structures

2.6 WHEN the system processes a document THEN the system SHALL detect the document type (exam vs general) and apply appropriate cleaning options automatically

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the system processes general Arabic documents without exam structure THEN the system SHALL CONTINUE TO apply aggressive cleaning to remove OCR noise and improve readability

3.2 WHEN the system processes documents with genuine garbage symbols and OCR artifacts THEN the system SHALL CONTINUE TO filter out corrupted lines that are not part of structured content

3.3 WHEN the system processes documents with broken line breaks in paragraphs THEN the system SHALL CONTINUE TO reconstruct logical paragraph structure for narrative text

3.4 WHEN the system processes documents with Unicode control characters and bidirectional markers THEN the system SHALL CONTINUE TO normalize and clean these artifacts

3.5 WHEN the system processes documents with HTML fragments from OCR THEN the system SHALL CONTINUE TO remove broken HTML tags

3.6 WHEN the system processes documents with repeated words or paragraphs THEN the system SHALL CONTINUE TO collapse duplicate content appropriately
