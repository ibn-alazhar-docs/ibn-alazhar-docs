# k6 Load Tests — Ibn Al-Azhar Docs

Load testing suite using [k6](https://k6.io) for the Ibn Al-Azhar Docs document processing platform.

## Install k6

### Linux (Debian/Ubuntu)

```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

### macOS

```bash
brew install k6
```

### Docker

```bash
docker pull grafana/k6
```

### Windows (choco)

```powershell
choco install k6
```

## Environment Variables

| Variable        | Default                 | Description                            |
| --------------- | ----------------------- | -------------------------------------- |
| `BASE_URL`      | `http://localhost:3000` | Target application URL                 |
| `AUTH_EMAIL`    | `admin@ibnalazhar.app`  | Login email for authenticated tests    |
| `AUTH_PASSWORD` | `Admin@123456`          | Login password for authenticated tests |

## Running Tests

### Single script

```bash
k6 run tests/load/k6/upload-scenarios.js
```

### With environment overrides

```bash
BASE_URL=https://staging.ibnalazhar.app \
AUTH_EMAIL=test@ibnalazhar.app \
AUTH_PASSWORD=TestPass123 \
  k6 run tests/load/k6/api-endpoints.js
```

### With output to JSON

```bash
k6 run --out json=results.json tests/load/k6/upload-scenarios.js
```

### All tests sequentially

```bash
for script in tests/load/k6/*.js; do
  [ "$(basename "$script")" = "helpers.js" ] && continue
  echo "=== Running $(basename "$script") ==="
  k6 run "$script"
done
```

### Specific scenario only (requires `--include-system-env-vars` and `--env`):

```bash
k6 run --env BASE_URL=http://localhost:3000 \
  tests/load/k6/stress-patterns.js \
  --execution-segment 0:1/6
```

Or use the scenario execution flag to run a single scenario:

```bash
k6 run tests/load/k6/stress-patterns.js \
  --execution-segment 0:1/6 \
  --scenario spike_500_users
```

## Test Scripts

### 1. `upload-scenarios.js`

| Scenario     | Users         | Duration             | File Size |
| ------------ | ------------- | -------------------- | --------- |
| Small files  | 10 concurrent | 2 min                | 1 MB      |
| Medium files | 50 concurrent | 2 min                | 100 KB    |
| Large files  | 5 concurrent  | 3 min                | 10 MB     |
| Ramp-up      | 0→50          | 30s ramp + 1min hold | 1 MB      |
| Stress       | 0→200         | 2min ramp            | 1 MB      |

**Thresholds:**

- p95 < 5s for small/medium files
- p95 < 15s for large files (10 MB)
- Error rate < 1%
- Zero timeouts

### 2. `export-scenarios.js`

| Scenario      | Users | Format                         |
| ------------- | ----- | ------------------------------ |
| PDF export    | 20    | `pdf`                          |
| DOCX export   | 20    | `docx`                         |
| Mixed formats | 30    | Random: `md,txt,json,pdf,docx` |
| Batch export  | 10    | ZIP of 3–10 docs               |

**Thresholds:**

- p95 < 10s single exports
- p95 < 15s PDF/DOCX
- p95 < 20s batch exports
- Error rate < 2%

### 3. `api-endpoints.js`

| Scenario    | Users | Pattern                   |
| ----------- | ----- | ------------------------- |
| Mixed       | 100   | 50% GET, 50% POST         |
| Read-heavy  | 100   | 80% GET, 20% POST         |
| Write-heavy | 50    | 30% GET, 70% POST         |
| Peak GET    | 0→500 | Ramp over 1min, hold 2min |

**Endpoints tested:**

- `GET /api/dashboard`
- `GET /api/documents`
- `GET /api/search`
- `GET /api/folders`
- `GET /api/tags`
- `POST /api/auth/register`
- `POST /api/auth/login`

**Thresholds:**

- p95 < 2s for GET endpoints
- p95 < 5s for POST endpoints
- Error rate < 0.1%

### 4. `search-scenarios.js`

| Scenario        | Users | Query Type            |
| --------------- | ----- | --------------------- |
| Short queries   | 20    | 1–2 word Arabic       |
| Arabic text     | 30    | Full Arabic phrases   |
| Empty results   | 10    | Non-existent terms    |
| Suggestions     | 20    | Partial input         |
| Filtered search | 15    | + status/type filters |

**Thresholds:**

- p95 < 1s for search queries
- p95 < 500ms for suggestions
- Zero errors for any search input

### 5. `stress-patterns.js`

| Scenario           | Load Pattern                    | Duration  |
| ------------------ | ------------------------------- | --------- |
| Spike              | 0→500 users in 10s              | 1 min 40s |
| Soak               | 50 users sustained              | 30 min    |
| Burst              | 200 users × 5 cycles            | 5 min     |
| Mixed workload     | 50 users (upload+export+search) | 3 min     |
| Rate limit (below) | 18 req/s sustained              | 5 min     |
| Rate limit (burst) | 5→50 req/s spike                | 50s       |

**Thresholds:**

- p95 stays stable during soak (no degradation)
- Spike p95 < 5s
- Error rate < 5% (accounts for expected 429s)
- Rate limit burst: verify 429 responses with `Retry-After`

### 6. `helpers.js`

Shared module used by all scripts:

- Arabic test data generation (names, document titles, filenames)
- Auth token management with auto-refresh
- Rate-limit-aware request wrapper (handles 429, waits for reset)
- Custom metrics tracking
- File generation for upload tests

## Interpreting Results

k6 outputs a summary with:

- **http_req_duration** — overall request latency (p50, p95, p99)
- **http_req_failed** — failure rate
- **Custom metrics** — per-endpoint trends (e.g. `upload_duration_small`)
- **Iterations** — total requests completed
- **VUs** — virtual user count over time

Key indicators:

- **p95 < threshold**: 95% of requests complete within time limit
- **Error rate < X%**: acceptable failure ratio
- **Counters**: `rate_limit_hits`, `upload_timeouts`, `status_429_count`

Example:

```
     upload_duration_small.........: avg=1.2s  min=0.3s  med=0.8s  p(90)=2.5s  p(95)=3.1s
     upload_duration_large.........: avg=5.4s  min=2.1s  med=4.8s  p(90)=9.2s  p(95)=11.3s
     errors........................: 0.3%  ✓ 12    ✗ 3891
     status_429_count..............: 45   45/s
```

## Running Locally

```bash
# 1. Ensure the app is running
cd /home/abed/Data/03_Professional/Projects/Ibn_Al_Azhar_Docs
docker compose up -d

# 2. Run a quick smoke test
k6 run --vus 5 --duration 30s tests/load/k6/api-endpoints.js

# 3. Run full suite (may take 30+ minutes)
for script in tests/load/k6/upload-scenarios.js tests/load/k6/export-scenarios.js tests/load/k6/api-endpoints.js tests/load/k6/search-scenarios.js; do
  k6 run "$script"
done
```

## Running in CI

```yaml
# GitHub Actions example
- name: Run k6 smoke tests
  run: |
    docker run --rm -i \
      -e BASE_URL=${{ env.BASE_URL }} \
      -e AUTH_EMAIL=${{ secrets.AUTH_EMAIL }} \
      -e AUTH_PASSWORD=${{ secrets.AUTH_PASSWORD }} \
      grafana/k6 run - <tests/load/k6/api-endpoints.js
```

For longer soak tests in CI, use k6 Cloud or `--out json` and upload results as artifacts.

## Notes

- All authenticated scripts auto-login via the `helpers.js` `getAuthToken()` function
- Rate limit aware requests sleep on `Retry-After` headers
- Large file uploads (10 MB) use 60s timeout
- Batch exports use 120s timeout
- Soak test (30 min) is designed for nightly runs, not PR CI
- Stress patterns that trigger 429s are expected behaviour and tracked separately
