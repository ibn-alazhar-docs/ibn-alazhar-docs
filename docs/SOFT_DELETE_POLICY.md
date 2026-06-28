# Soft Delete Policy

**ADR Reference:** [ADR-012-soft-delete-retention.md](../ADR/ADR-012-soft-delete-retention.md)

## Overview

All user-owned entities (Documents, Tags, Folders) use soft delete via a `deletedAt DateTime?` field. Hard delete is reserved for admin operations and automated cleanup.

## Models with Soft Delete

| Model      | Field                 | Indexes                        | Hard Delete                       |
| ---------- | --------------------- | ------------------------------ | --------------------------------- |
| `Document` | `deletedAt DateTime?` | `@@index([userId, deletedAt])` | Admin only, cron after 30 days    |
| `Tag`      | `deletedAt DateTime?` | `@@index([userId, deletedAt])` | Admin only, merge operation       |
| `Folder`   | `deletedAt DateTime?` | `@@index([userId, deletedAt])` | Admin only, cascade after 30 days |

## Query Rules

All repository queries MUST filter soft-deleted records:

```typescript
// ✅ Correct — filters soft-deleted
await prisma.document.findMany({
  where: { userId, deletedAt: null },
});

// ❌ Wrong — includes soft-deleted
await prisma.document.findMany({
  where: { userId },
});
```

## Operations

### Soft Delete (User)

```typescript
await prisma.document.update({
  where: { id },
  data: { deletedAt: new Date() },
});
```

### Restore (User)

```typescript
await prisma.document.update({
  where: { id },
  data: { deletedAt: null },
});
```

### Hard Delete (Admin/Cron)

```typescript
await prisma.document.delete({
  where: { id },
});
// Also delete from MinIO: ibn-al-azhar-docs-files/{id}
```

## Retention

- **Documents:** 30 days in trash, then auto-hard-deleted via cron
- **Tags:** 30 days in trash, then auto-hard-deleted via cron
- **Folders:** 30 days in trash, then auto-hard-deleted via cron

## Storage Accounting

Soft-deleted records are excluded from user storage quota:

```typescript
const usedStorage = await prisma.document.aggregate({
  where: { userId, deletedAt: null },
  _sum: { fileSize: true },
});
```

## Tag Merge Behavior

When merging tags (moving documents from source to target):

1. Source tag is soft-deleted (`deletedAt = new Date()`)
2. All documents referencing source tag are reassigned to target tag
3. Source tag remains in DB for 30 days, then hard-deleted

## Cron Job

A daily BullMQ repeating job handles cleanup:

```
Schedule: 0 2 * * * (daily at 2:00 AM)
Action: Hard-delete documents/tags older than 30 days
Cleanup: Remove corresponding MinIO objects
```
