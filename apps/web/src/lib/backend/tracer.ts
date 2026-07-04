import { trace, SpanStatusCode, type Span } from "@opentelemetry/api";

const tracer = trace.getTracer("ibn-al-azhar-docs");

export async function withSpan<T>(
  name: string,
  fn: (span: Span) => Promise<T>,
  attributes?: Record<string, string | number | boolean>,
): Promise<T> {
  return tracer.startActiveSpan(name, async (span) => {
    try {
      if (attributes) {
        span.setAttributes(attributes);
      }
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : "Unknown error",
      });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}

export function addEvent(name: string, attributes?: Record<string, string | number | boolean>) {
  const span = trace.getActiveSpan();
  if (span) {
    span.addEvent(name, attributes);
  }
}

export function setAttribute(key: string, value: string | number | boolean) {
  const span = trace.getActiveSpan();
  if (span) {
    span.setAttribute(key, value);
  }
}
