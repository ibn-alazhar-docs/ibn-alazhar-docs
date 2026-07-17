export type { DocStatus, ExportFormat, ErrorCode, FailureCategory } from "./types";

export { DOC_STATUS_MAP, STATUS_LABELS, ERROR_CODES, FAILURE_CATEGORIES } from "./types";

export { logger } from "./logger";

export { startHealthServer } from "./health-server";

export {
  ServiceErrorType,
  ServiceErrorClassifier,
  RetryExecutor,
  ServiceHealthValidator,
  DATABASE_RETRY_STRATEGY,
  REDIS_RETRY_STRATEGY,
} from "./service-health";
export type {
  ServiceError,
  RetryStrategy,
  ServiceCheckFn,
  ServiceValidationResult,
} from "./service-health";

export type { ServiceCheckResult, DetailedHealthResponse } from "./types/health";

export type {
  DocumentIR,
  DocumentMetadata,
  BlockNode,
  HeadingNode,
  ParagraphNode,
  ListNode,
  ListItemNode,
  CodeBlockNode,
  InlineNode,
  TextNode,
  LineBreakNode,
} from "./types/document-ir";

export {
  documentIRSchema,
  isDocumentIR,
  parseDocumentIR,
  safeParseDocumentIR,
} from "./types/document-ir";
