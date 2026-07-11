# Spec 006: Tag Management

## Status

- **Status**: implemented
- **Phase**: 2C-2
- **Created**: 2026-05-21
- **Implemented**: 2026-06-15

## Overview

Tags provide a flexible, cross-folder categorization system for documents. Unlike folders (hierarchical, single-parent), tags are flat, multi-assign, and color-coded.

## User Stories

- As a student, I want to create colored tags so I can organize documents by topic
- As a student, I want to assign multiple tags to a document so it appears in multiple categories
- As a student, I want to filter documents by tag in search
- As a student, I want to bulk-tag/untag documents for batch organization
- As a student, I want to merge duplicate tags to keep my tag list clean
- As a student, I want to export documents by tag

## Acceptance Criteria

- Users can create tags (name + color, max 50 per user)
- Tags can be renamed and recolored
- Tags can be deleted (removes from all documents)
- Documents can have multiple tags (many-to-many)
- Documents can be bulk-tagged and bulk-untagged
- Search results can be filtered by tagId
- Tags appear in auto-suggestions
- Duplicate tags can be merged (source → target)
- Documents can be exported by tag

## API Endpoints

| Method | Route                              | Description                         |
| ------ | ---------------------------------- | ----------------------------------- |
| GET    | `/api/tags`                        | List all user's tags with doc count |
| POST   | `/api/tags`                        | Create tag                          |
| GET    | `/api/tags/[id]`                   | Get single tag                      |
| PATCH  | `/api/tags/[id]`                   | Update tag name/color               |
| DELETE | `/api/tags/[id]`                   | Delete tag                          |
| POST   | `/api/tags/merge`                  | Merge source tag into target        |
| GET    | `/api/documents/[id]/tags`         | Get document's tags                 |
| POST   | `/api/documents/[id]/tags`         | Add tag to document                 |
| PUT    | `/api/documents/[id]/tags`         | Set document tags                   |
| DELETE | `/api/documents/[id]/tags/[tagId]` | Remove tag from document            |
| POST   | `/api/documents/bulk-tag`          | Bulk tag documents                  |
| POST   | `/api/documents/bulk-untag`        | Bulk untag documents                |
| GET    | `/api/folders/[id]/tags`           | Get tags used in a folder's docs    |

## Database Changes

- `Tag` model: id, name, color, userId, createdAt, deletedAt
- `TagDocument` join table: tagId, documentId (unique pair, cascade delete)
- Soft delete on Tag, hard cascade on TagDocument

## Security Considerations

- Tags owned by user (userId scoped)
- All operations use `ownedWhere()` helper
- Zod validation on all inputs
- Max 50 tags per user, max 50 docs per bulk operation
