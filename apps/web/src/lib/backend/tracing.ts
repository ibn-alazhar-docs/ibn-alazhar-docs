import { NodeSDK } from "@opentelemetry/sdk-node";
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";
import { SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { FetchInstrumentation } from "@opentelemetry/instrumentation-fetch";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { logger } from "@/lib/shared/logger";

const SERVICE_NAME = "ibn-al-azhar-docs";
const SERVICE_VERSION = process.env.npm_package_version || "1.0.0";
const OTLP_ENDPOINT = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318";

function initTracing() {
  if (process.env.OTEL_ENABLED !== "true") {
    return;
  }

  const exporter = new OTLPTraceExporter({
    url: `${OTLP_ENDPOINT}/v1/traces`,
  });

  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: SERVICE_NAME,
      [ATTR_SERVICE_VERSION]: SERVICE_VERSION,
      "deployment.environment": process.env.NODE_ENV || "development",
    }),
    spanProcessor: new SimpleSpanProcessor(exporter),
    instrumentations: [
      new HttpInstrumentation({
        ignoreIncomingRequestHook: (request) => {
          const url = request.url || "";
          return url.includes("/_next/") || url.includes("/api/health");
        },
      }),
      new FetchInstrumentation(),
    ],
  });

  sdk.start();

  logger.info(`[OpenTelemetry] Tracing initialized → ${OTLP_ENDPOINT}`);
}

initTracing();
