# ALERTING_RULES.md — Prometheus Alert Rules

## Alert Definitions

| Alert             | Severity | Threshold                   | Action                        |
| ----------------- | -------- | --------------------------- | ----------------------------- |
| PostgreSQLDown    | Critical | Health check fails 2×       | Page on-call, follow RUNBOOK  |
| RedisDown         | Critical | Health check fails 2×       | Page on-call, follow RUNBOOK  |
| MinIODown         | High     | Health check fails 3×       | Page during business hours    |
| OCRWorkerDown     | High     | Container not running 5 min | Restart worker                |
| ExportWorkerDown  | High     | Container not running 5 min | Restart worker                |
| DiskUsageHigh     | Warning  | > 80% for 10 min            | Clean old backups             |
| DiskUsageCritical | Critical | > 95% for 5 min             | Emergency cleanup             |
| OCRQueueDepth     | Warning  | > 50 jobs waiting           | Scale OCR workers             |
| ExportQueueDepth  | Warning  | > 20 jobs waiting           | Scale export workers          |
| OCRFailureRate    | Warning  | > 5% over 15 min            | Check OCR provider logs       |
| WebHighLatency    | Warning  | p95 > 2s for 5 min          | Check DB/Redis health         |
| WebErrorRate      | High     | > 5% 5xx for 5 min          | Check logs, consider rollback |
| BackupFailed      | Warning  | No successful backup in 25h | Check Ofelia logs             |

---

## Prometheus Rules File

Location: `infrastructure/monitoring/alert-rules.yml`

Mounted into Prometheus container via `prometheus.yml`.

## Notification Channels

| Channel       | Alerts          | Method  |
| ------------- | --------------- | ------- |
| PagerDuty     | Critical (P0)   | Webhook |
| Slack #alerts | High (P1)       | Webhook |
| Slack #ops    | Warning (P2)    | Webhook |
| Email         | Backup failures | SMTP    |
