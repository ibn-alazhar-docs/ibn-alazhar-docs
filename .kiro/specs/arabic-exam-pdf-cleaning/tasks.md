# Implementation Tasks

## Phase 1: Gemini Prompt Enhancement (Critical)

- [-] 1. Update Gemini OCR prompts to use English instructions
  - [x] 1.1 Replace Arabic prompt with English in `extractText()` method
  - [x] 1.2 Replace Arabic batch prompt with English in `extractPages()` method
  - [ ] 1.3 Test prompts with sample Arabic exam PDF to verify output quality

## Phase 2: Testing & Validation

- [x] 2. Export EXAM_OPTIONS and patterns from text module
  - [x] 2.1 Add EXAM_OPTIONS to exports in `packages/pipeline/src/text/index.ts`
  - [x] 2.2 Add detectDocumentType to exports in `packages/pipeline/src/text/index.ts`
  - [x] 2.3 Add exam pattern constants to exports in `packages/pipeline/src/text/index.ts`

- [x] 3. Add unit tests for detectDocumentType
  - [x] 3.1 Create `packages/pipeline/src/text/analyze.test.ts`
  - [x] 3.2 Test exam detection with س\d+ pattern
  - [x] 3.3 Test exam detection with answer choices (أ), (ب), (ج)
  - [x] 3.4 Test general document classification
  - [x] 3.5 Test score threshold behavior (score ≥4)
  - [x] 3.6 Test with multiple pattern combinations

- [ ] 4. Add unit tests for EXAM_OPTIONS cleaning
  - [x] 4.1 Create `packages/pipeline/src/text/clean.test.ts` (if not exists)
  - [x] 4.2 Test preservation of question markers (س١:, س5:)
  - [x] 4.3 Test preservation of answer choice symbols
  - [x] 4.4 Test no line merging for exam content
  - [x] 4.5 Test aggressive cleaning still works for general docs
  - [x] 4.6 Test auto-detection triggers correctly

- [ ] 5. Add integration tests with sample exam PDF
  - [ ] 5.1 Create `tests/integration/ocr-exam.test.ts`
  - [ ] 5.2 Add sample Arabic exam PDF fixture to `tests/fixtures/`
  - [ ] 5.3 Test end-to-end OCR extraction preserves structure
  - [ ] 5.4 Verify question numbers in output
  - [ ] 5.5 Verify answer choices in output
  - [ ] 5.6 Test all export formats (MD, TXT, JSON, DOCX, PDF)

- [ ] 6. Validate Gemini API configuration
  - [ ] 6.1 Add valid GEMINI_API_KEY to `.env` (get from https://aistudio.google.com/app/apikey)
  - [ ] 6.2 Test Gemini OCR provider with exam PDF
  - [ ] 6.3 Verify enhanced English prompts are being used
  - [ ] 6.4 Check fallback behavior when API key missing

## Phase 3: Production Deployment

- [ ] 7. Update production configuration
  - [ ] 7.1 Add GEMINI_API_KEY to `.env.production.example`
  - [ ] 7.2 Update deployment documentation with Gemini setup
  - [ ] 7.3 Add OCR configuration section to production README

- [ ] 8. Monitoring and validation
  - [ ] 8.1 Add logging for document type detection results
  - [ ] 8.2 Track OCR confidence scores in production
  - [ ] 8.3 Monitor exam vs general classification accuracy
  - [ ] 8.4 Gather user feedback on extraction quality
