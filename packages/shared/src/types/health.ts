/**
 * Health check response types for the detailed service health endpoint.
 *
 * Requirement 4.2: Typed response schema for /api/health/detailed
 */

export interface ServiceCheckResult {
  status: "healthy" | "unhealthy";
  responseTimeMs: number;
}

export interface DetailedHealthResponse {
  overall: "healthy" | "unhealthy";
  timestamp: string;
  services: {
    database: ServiceCheckResult;
    redis: ServiceCheckResult;
    storage: ServiceCheckResult;
  };
}
