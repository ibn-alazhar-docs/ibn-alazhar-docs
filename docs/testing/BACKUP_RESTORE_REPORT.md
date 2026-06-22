# BACKUP_RESTORE_REPORT.md — Phase 3I

## Summary

| Metric            | Value |
| ----------------- | ----- |
| Test Files        | 3     |
| Tests             | 48    |
| All Passing       | ✓     |
| Backup Scenarios  | 12    |
| Restore Scenarios | 16    |
| Integrity Checks  | 12    |
| Failure Handling  | 8     |
| Data Loss         | 0     |

## Decision: **GO**

Full system backup and restore verified. All entities, relationships, and storage keys survive serialization round-trips with zero data loss.

---

## Backup Results

### Database Backup

| Entity         | Count | Backup Time |
| -------------- | ----- | ----------- |
| Users          | 1     | 2ms         |
| Documents      | 5     | —           |
| Folders        | 1     | —           |
| Tags           | 3     | —           |
| TagDocuments   | 3     | —           |
| ShareLinks     | 1     | —           |
| ConversionJobs | 1     | —           |

- Backup manifest includes SHA-256 checksum for integrity verification
- Backup version stamped (v1.0) with ISO timestamp
- Entity counts in manifest match actual data

### Storage (MinIO) Backup

| Key Type        | Pattern                               | Count         |
| --------------- | ------------------------------------- | ------------- |
| Upload keys     | `uploads/{userId}/{docId}_{filename}` | Deterministic |
| OCR result keys | `ocr-results/{docId}/{filename}`      | Deterministic |
| Export keys     | `exports/{docId}/{filename}`          | Deterministic |

- All storage keys are deterministic and reproducible from database records
- MD5 file checksums computed for integrity verification
- Manifest tracks total object count and total size

### Full System Backup

| Metric                                            | Value                            |
| ------------------------------------------------- | -------------------------------- |
| 3 documents + 2 folders + 1 tag + 1 share + 1 job | Backup time: < 5ms               |
| JSON size                                         | < 10KB                           |
| Storage keys generated                            | 3 upload + 3 OCR + 6 export = 12 |

---

## Restore Results

### Document Restore

| Check                                             | Result |
| ------------------------------------------------- | ------ |
| All documents present in backup                   | ✓      |
| Storage keys valid and reproducible               | ✓      |
| File sizes preserved (BigInt → string conversion) | ✓      |
| Output formats preserved                          | ✓      |
| Document status preserved                         | ✓      |

### Folder Restore

| Check                               | Result |
| ----------------------------------- | ------ |
| Folder hierarchy preserved          | ✓      |
| Parent-child references valid       | ✓      |
| Folder ordering preserved           | ✓      |
| Documents linked to correct folders | ✓      |

### Tag Restore

| Check                            | Result |
| -------------------------------- | ------ |
| All tags present                 | ✓      |
| Tag colors preserved             | ✓      |
| Tag-document associations intact | ✓      |
| No orphaned tag-document links   | ✓      |

### Share Link Restore

| Check                                 | Result |
| ------------------------------------- | ------ |
| Share tokens preserved                | ✓      |
| Share links reference valid documents | ✓      |
| Expiration dates preserved            | ✓      |

### Conversion Job Restore

| Check                          | Result |
| ------------------------------ | ------ |
| Jobs reference valid documents | ✓      |
| Job status preserved           | ✓      |
| Input/output keys preserved    | ✓      |

---

## Data Integrity

### Checksum Verification

| Scenario                                    | Result |
| ------------------------------------------- | ------ |
| Valid backup passes checksum                | ✓      |
| Corrupted backup detected (data tampered)   | ✓      |
| Tampered entity count detected              | ✓      |
| Empty backup validates correctly            | ✓      |
| Round-trip serialization preserves checksum | ✓      |

### Relationship Integrity

| Check                                               | Result |
| --------------------------------------------------- | ------ |
| All folder parent references point to valid folders | ✓      |
| All tag-document pairs reference valid entities     | ✓      |
| All share links reference valid documents           | ✓      |
| All conversion jobs reference valid documents       | ✓      |
| Storage keys match document records                 | ✓      |

---

## Recovery Time

| Operation                              | Time  |
| -------------------------------------- | ----- |
| Full database backup (15 entities)     | 2ms   |
| Full system backup (DB + storage keys) | < 5ms |
| Serialization to JSON                  | < 1ms |
| Deserialization from JSON              | < 1ms |
| Integrity checksum computation         | < 1ms |

---

## Failure Handling

### Missing Backup Files

| Scenario             | Detection                      |
| -------------------- | ------------------------------ |
| Missing upload files | Detected by key comparison     |
| Missing OCR results  | Detected by expected vs actual |
| Missing export files | Detected by expected vs actual |

### Partial Restore Failures

| Scenario                             | Behavior                        |
| ------------------------------------ | ------------------------------- |
| Missing document → orphaned tags     | Detected, tags skipped          |
| Missing folder → orphaned documents  | Detected, docs assigned to root |
| Missing user → all entities orphaned | Detected, all entities flagged  |
| Duplicate storage keys               | Detected by manifest validation |

### Backup Corruption

| Scenario                | Detection                      |
| ----------------------- | ------------------------------ |
| Data tampering          | SHA-256 checksum mismatch      |
| Entity count mismatch   | Manifest count vs actual       |
| Size mismatch (storage) | Manifest totalSize vs computed |

---

## Recommendations

### Production Backup Strategy

1. **Database:** Use `pg_dump` for PostgreSQL backups (full + WAL for point-in-time recovery)
2. **Storage:** Use MinIO's `mc mirror` for bucket replication
3. **Schedule:** Daily full backup + continuous WAL archiving
4. **Retention:** 30-day rolling window with monthly snapshots
5. **Integrity:** Verify checksums after every backup

### BigInt Handling

Prisma's `fileSize` field uses `BigInt`, which is not JSON-serializable. All backup/restore tooling must convert BigInt → string during serialization and string → BigInt during deserialization. The `safeStringify` helper used in these tests demonstrates the correct pattern.

### Storage Key Determinism

All storage keys follow deterministic patterns that can be reconstructed from database records. This means:

- No need to maintain a separate storage manifest
- Storage keys can be verified against database records during restore
- Missing files are detectable by comparing expected vs actual keys

---

## Test Inventory

| #   | Test File                     | Tests  | Status       |
| --- | ----------------------------- | ------ | ------------ |
| 1   | `database-backup.test.ts`     | 16     | PASS         |
| 2   | `storage-backup.test.ts`      | 18     | PASS         |
| 3   | `full-system-restore.test.ts` | 14     | PASS         |
|     | **Total**                     | **48** | **ALL PASS** |

## How to Run

```bash
# Backup tests (requires PostgreSQL)
./ibn.sh dev-infra
pnpm db:generate && pnpm db:migrate
pnpm test:backup
```
