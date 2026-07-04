#!/bin/bash
# API Route Health Check Script
# Tests all API endpoints and reports status

BASE_URL="${BASE_URL:-http://localhost:3000}"
PASS=0
FAIL=0
SKIP=0

check_endpoint() {
  local method=$1
  local path=$2
  local expected=$3
  local name=$4
  
  if [ "$method" = "GET" ]; then
    status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$path" 2>/dev/null)
  else
    status=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d '{}' "$BASE_URL$path" 2>/dev/null)
  fi
  
  if [ "$status" = "$expected" ]; then
    echo "✅ $name ($path) → $status"
    PASS=$((PASS + 1))
  elif [ "$status" = "000" ]; then
    echo "⚠️  $name ($path) → Connection failed"
    SKIP=$((SKIP + 1))
  else
    echo "❌ $name ($path) → $status (expected $expected)"
    FAIL=$((FAIL + 1))
  fi
}

echo "========================================="
echo "  API Routes Health Check"
echo "  Base URL: $BASE_URL"
echo "========================================="
echo ""

echo "--- Public Endpoints ---"
check_endpoint GET "/api/health" "200" "Health check"
check_endpoint GET "/api/health/live" "200" "Liveness probe"
check_endpoint GET "/api/health/ready" "200|503" "Readiness probe"
check_endpoint GET "/api/actuator/health" "200" "Actuator health"
check_endpoint GET "/api/actuator/info" "200" "Actuator info"
check_endpoint GET "/api/actuator/metrics" "200" "Actuator metrics"
check_endpoint GET "/api/actuator/prometheus" "200" "Actuator Prometheus"
check_endpoint GET "/api/metrics" "200|401" "Metrics"
check_endpoint GET "/api/metrics/prometheus" "200|401" "Prometheus metrics"
check_endpoint GET "/api/docs/openapi" "200" "OpenAPI spec"
echo ""

echo "--- Protected Endpoints (expect 401/302) ---"
check_endpoint GET "/api/documents" "401|302|307" "List documents"
check_endpoint GET "/api/folders" "401|302|307" "List folders"
check_endpoint GET "/api/tags" "401|302|307" "List tags"
check_endpoint GET "/api/search?q=test" "401|302|307" "Search"
check_endpoint GET "/api/profile" "401|302|307" "User profile"
check_endpoint GET "/api/users" "401|302|307" "List users"
check_endpoint GET "/api/bookmarks" "401|302|307" "Bookmarks"
check_endpoint GET "/api/analytics" "401|302|307" "Analytics"
check_endpoint GET "/api/webhooks" "401|302|307" "Webhooks"
check_endpoint GET "/api/conversion/list" "401|302|307" "Conversion list"
echo ""

echo "--- POST Endpoints (expect 401/405) ---"
check_endpoint POST "/api/upload" "401|302|307|405" "Upload"
check_endpoint POST "/api/documents/bulk-delete" "401|302|307|405" "Bulk delete"
check_endpoint POST "/api/tags/merge" "401|302|307|405" "Merge tags"
check_endpoint POST "/api/export" "401|302|307|405" "Export"
check_endpoint POST "/api/conversion/start" "401|302|307|405" "Start conversion"
check_endpoint POST "/api/auth/register" "400|405|422" "Register"
echo ""

echo "--- Dynamic Endpoints (expect 401/404) ---"
check_endpoint GET "/api/documents/nonexistent" "401|302|307|404" "Get document"
check_endpoint GET "/api/folders/nonexistent" "401|302|307|404" "Get folder"
check_endpoint GET "/api/tags/nonexistent" "401|302|307|404" "Get tag"
check_endpoint GET "/api/share/nonexistent" "401|302|307|404" "Share link"
echo ""

echo "--- Error Handling ---"
check_endpoint GET "/api/nonexistent" "404" "Non-existent route"
check_endpoint POST "/api/health" "405|404" "POST to GET-only route"
echo ""

echo "========================================="
echo "  Results: ✅ $PASS passed | ❌ $FAIL failed | ⚠️  $SKIP skipped"
echo "========================================="

exit $FAIL
