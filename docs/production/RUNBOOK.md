# RUNBOOK.md — Operations Runbook

## Quick Reference

| Incident           | Severity | First Action           | Recovery Target |
| ------------------ | -------- | ---------------------- | --------------- |
| PostgreSQL down    | P0       | Check container health | < 5 min         |
| Redis down         | P0       | Check container health | < 5 min         |
| MinIO down         | P1       | Check container health | < 10 min        |
| OCR Worker down    | P1       | Restart container      | < 5 min         |
| Export Worker down | P1       | Restart container      | < 5 min         |
| Web app 503        | P0       | Check health endpoint  | < 5 min         |
| Disk > 80%         | P2       | Clean old backups      | < 30 min        |
| Backup failure     | P2       | Check Ofelia logs      | < 1 hour        |

---

## PostgreSQL Down

### Symptoms

- `/api/health` returns `503` with `database.status: "error"`
- All API endpoints return `500`
- Users cannot log in, upload, or access documents

### Diagnosis

```bash
# Check container status
docker compose ps postgres

# Check PostgreSQL logs
docker compose logs --tail 50 postgres

# Check if port is listening
docker compose exec postgres pg_isready -U ibn_docs

# Check disk space
df -h /var/lib/docker/volumes/
```

### Recovery

**If container crashed:**

```bash
docker compose restart postgres
# Wait for health check (5 retries × 5s = 25s max)
docker compose ps postgres
```

**If data corruption:**

```bash
# Stop all services
docker compose stop web ocr-worker export-worker

# Restore from backup
docker compose exec postgres pg_restore -U ibn_docs -d ibn_docs /backups/latest.dump

# Restart
docker compose start postgres
# Wait for healthy
docker compose start web ocr-worker export-worker
```

**If disk full:**

```bash
# Remove old WAL files
docker compose exec postgres psql -U ibn_docs -c "SELECT pg_wal_replay_pause();"
# Clean old backups
find /backups -name "*.dump" -mtime +30 -delete
docker compose restart postgres
```

---

## Redis Down

### Symptoms

- Rate limiting falls back to in-memory (degraded but functional)
- OCR and export jobs cannot be enqueued
- Workers idle (no jobs to process)

### Diagnosis

```bash
docker compose ps redis
docker compose logs --tail 50 redis
docker compose exec redis redis-cli -a "$REDIS_PASSWORD" ping
```

### Recovery

```bash
docker compose restart redis
# Verify health
docker compose exec redis redis-cli -a "$REDIS_PASSWORD" ping
# Check queue depth (should recover from persistence)
docker compose exec redis redis-cli -a "$REDIS_PASSWORD" info keyspace
```

**If Redis data lost (RDB corrupted):**

- Jobs in queue are lost — users will need to re-upload
- Rate limiter resets (acceptable)
- No data loss (all data in PostgreSQL)

---

## MinIO Down

### Symptoms

- File uploads fail with `500`
- OCR processing fails (cannot read uploaded files)
- Export downloads fail
- Share link content unavailable

### Diagnosis

```bash
docker compose ps minio
docker compose logs --tail 50 minio
curl http://localhost:9000/minio/health/live
```

### Recovery

```bash
docker compose restart minio
# Verify health
curl http://localhost:9000/minio/health/live
# Check bucket exists
docker compose exec minio mc ls local/ibn-al-azhar-docs
```

**If data loss:**

```bash
# Restore from backup
./infrastructure/scripts/backup-job.sh restore-minio
```

---

## Worker Down (OCR or Export)

### Symptoms

- Jobs queue up but don't process
- `/api/metrics` shows increasing queue depth
- Users see "processing" indefinitely

### Diagnosis

```bash
# Check which worker is down
docker compose ps ocr-worker export-worker

# Check worker logs
docker compose logs --tail 100 ocr-worker
docker compose logs --tail 100 export-worker

# Check Redis queue depth
docker compose exec redis redis-cli -a "$REDIS_PASSWORD" llen pipeline-ocr
docker compose exec redis redis-cli -a "$REDIS_PASSWORD" llen pipeline-export
```

### Recovery

```bash
# Restart the worker
docker compose restart ocr-worker   # or export-worker

# Verify it's processing
docker compose logs --follow ocr-worker

# If worker keeps crashing, check for poison pill job:
docker compose exec redis redis-cli -a "$REDIS_PASSWORD" lrange pipeline-ocr 0 5
```

**If stuck jobs:**

```bash
# Move stuck jobs back to waiting queue
docker compose exec redis redis-cli -a "$REDIS_PASSWORD" \
  eval "local jobs = redis.call('lrange', 'pipeline-ocr:stalled', 0, -1); for _,j in ipairs(jobs) do redis.call('rpush', 'pipeline-ocr:wait', j) end; redis.call('del', 'pipeline-ocr:stalled'); return #jobs" 0
```

---

## Deployment Rollback

### When to Rollback

- Health check failing after deploy
- Error rate > 5% in first 10 minutes
- Critical functionality broken

### Rollback Procedure

```bash
# List available images
docker images | grep ibn-web

# Rollback to previous version
docker compose up -d --no-build web
# If specific tag needed:
docker compose pull web:previous-tag
docker compose up -d web

# Verify health
curl http://localhost:3000/api/health
curl http://localhost:3000/api/health/ready
```

### Database Migration Rollback

```bash
# List migrations
docker compose exec postgres psql -U ibn_docs -c "SELECT * FROM _prisma_migrations ORDER BY started_at DESC LIMIT 5;"

# Rollback last migration
docker compose exec web npx prisma migrate resolve --rolled-back <migration_name>
```

---

## Backup Restore

### PostgreSQL Restore

```bash
# Stop web services
docker compose stop web ocr-worker export-worker

# Restore
docker compose exec -T postgres pg_restore -U ibn_docs -d ibn_docs --clean < /backups/postgres/latest.dump

# Restart
docker compose start postgres
docker compose start web ocr-worker export-worker

# Verify
curl http://localhost:3000/api/health/ready
```

### MinIO Restore

```bash
# Restore from mc mirror backup
docker compose exec minio mc mirror /backups/minio/ local/ibn-al-azhar-docs/

# Verify
docker compose exec minio mc ls local/ibn-al-azhar-docs/uploads/ | head
```

---

## Scaling Procedures

### Scale OCR Workers

```bash
# Add more OCR workers for high load
docker compose up -d --scale ocr-worker=3
```

### Increase PgBouncer Pool

Edit `docker-compose.yml`:

```yaml
PGBOUNCER_DEFAULT_POOL_SIZE: "50"
PGBOUNCER_MAX_CLIENT_CONN: "400"
```

```bash
docker compose restart pgbouncer
```
