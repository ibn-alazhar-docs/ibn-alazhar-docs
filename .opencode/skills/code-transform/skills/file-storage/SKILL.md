---
name: file-storage
description: "Object storage and file upload — S3, Cloudflare R2, MinIO, GCS, Azure Blob. Picks the backend, wires presigned-URL uploads (clients upload direct, server never proxies the bytes), image processing (resize/optimize via Lambda or Cloudflare Workers), CDN in front (CloudFront/Cloudflare), signed URLs for private content, and lifecycle/versioning policies. Triggers in Phase 6 EXECUTE when the app needs file upload, and in Phase 2 AUDIT when Dimension 4 finds public buckets, secrets in S3 metadata, or server-proxied uploads."
license: MIT
metadata:
  version: "1.0"
  author: OmniProject AI
  category: infra
---

# File Storage

> Infra sub-skill for anything that stores user-uploaded blobs. Picks the backend (S3/R2/MinIO/GCS/Blob), implements presigned-URL uploads so the bytes never touch the app server, runs image optimization (resize, WebP/AVIF, EXIF strip) via Lambda or Cloudflare Workers, puts a CDN in front, and emits signed URLs for private content. Coordinates with `auth-setup` (signed URL authorization), `error-monitoring` (upload failure alerts), and `cost-optimization` (lifecycle policies to cheap tiers).

## When to Use

| Phase                | Trigger                                                                                                                                          | Why                                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Phase 2 — AUDIT      | Dimension 4 (Security) finds a public bucket with no CDN, secrets in S3 metadata, or `app.post('/upload')` that streams bytes through the server | Server-proxied uploads waste bandwidth and memory; public buckets leak data; S3 metadata is not encrypted |
| Phase 2 — AUDIT      | Dimension 5 (Performance) finds uploads timing out at large sizes                                                                                | Missing presigned URLs — server is the bottleneck                                                         |
| Phase 6 — EXECUTE    | User says "add file upload", "add image upload", "add S3", "add profile photos", "add document storage"                                          | This is the executing sub-skill                                                                           |
| Phase 6 — EXECUTE    | Migrating storage backends (S3 → R2, MinIO → S3)                                                                                                 | Full replace of storage layer, copy objects, update keys                                                  |
| Phase 9 — ACCEPTANCE | Upload a test file, verify it's accessible via CDN, verify private file needs signed URL                                                         | Storage is foundational — must walk the full upload→store→retrieve loop                                   |
| Phase 11 — ROLLOUT   | Verify bucket policies, lifecycle rules, versioning enabled, CORS configured                                                                     | Misconfigured bucket = data loss or leak                                                                  |

**Do NOT use this sub-skill for:** database BLOBs (use the DB's native binary type only if < 1MB and accessed transactionally — otherwise use object storage), video transcoding (use a dedicated service like Mux or AWS MediaConvert), or block storage for VMs (use EBS / persistent disks).

## What It Does

1. Picks the backend via the Decision Tree.
2. Installs the official SDK: `@aws-sdk/client-s3` / `@aws-sdk/s3-request-presigner` / `@cloudflare/r2` (S3-compatible) / `minio` / `@google-cloud/storage` / `@azure/storage-blob`.
3. Wires environment: `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` (or IAM role on EC2/EKS) — never hardcoded.
4. Implements presigned upload (server signs, client uploads directly):
   - `POST /uploads/sign` → returns `{upload_url, method, headers, expires_in, object_key}`.
   - Client PUTs the file directly to `upload_url` with the prescribed headers.
   - Client notifies server of completion via `POST /uploads/complete` with the `object_key` and metadata.
5. Implements presigned download for private files (signed URL with short TTL — default 15 min, max 1 hour).
6. Wires image processing:
   - **AWS**: S3 trigger → Lambda (with `sharp`) → writes resized variants to a derived bucket.
   - **Cloudflare**: Workers + Image Resizing (or R2 + Workers + `@cf/image-resizing`).
   - Generates responsive variants: `original`, `large` (1920w), `medium` (768w), `thumbnail` (200w).
   - Outputs WebP + AVIF (with JPEG fallback via `<picture>` element).
   - Strips EXIF (location privacy) unless explicitly retained.
7. Puts a CDN in front: CloudFront (AWS), Cloudflare (R2/anything), Fastly, or GCP Cloud CDN.
8. Emits bucket policies: private by default, public only via CDN with `Origin Access Control` (CloudFront) or `Public Read` on a CDN-fronted bucket.
9. Sets lifecycle policies: transition to `STANDARD_IA` after 30 days, `GLACIER` after 90 days, `EXPIRE` for temp uploads after 7 days.
10. Enables versioning (always) and MFA delete on production buckets (optional but recommended).
11. Emits a `storage_client` for other modules: `get_upload_url`, `get_download_url`, `delete_object`, `list_objects`.

## Integration Contract

```
INPUT:
  - backend_hint: s3|r2|minio|gcs|blob (optional — decision tree decides)
  - framework: express|fastify|fastapi|django|next|rails (required)
  - bucket_name: string (required — e.g. "myapp-uploads")
  - region: string (default "us-east-1")
  - public_anonymous_read: bool (default false — almost always false; use CDN)
  - image_processing: bool (default true)
  - cdn_domain: string (optional — e.g. "cdn.example.com")
  - lifecycle_temp_days: int (default 7 — temp uploads expire)
  - max_upload_size_mb: int (default 100)

OUTPUT (JSON to stdout):
  {
    "status": "ok|error",
    "backend": "s3|r2|minio|gcs|blob",
    "bucket": "myapp-uploads",
    "region": "us-east-1",
    "files_created": [
      "src/storage/client.{ts,py}",
      "src/storage/uploads.{ts,py}",
      "src/storage/signed_urls.{ts,py}",
      "src/storage/image_processing.{ts,py}"  # if image_processing=true
    ],
    "env_required": [
      "S3_BUCKET",
      "S3_REGION",
      "S3_ACCESS_KEY_ID",
      "S3_SECRET_ACCESS_KEY"
    ],
    "cdn_url": "https://cdn.example.com",
    "cors_config": "configured for presigned upload",
    "lifecycle_policy": "STANDARD_IA @30d, GLACIER @90d, EXPIRE temp @7d",
    "versioning": "enabled",
    "image_variants": ["original", "large", "medium", "thumbnail"],
    "image_formats": ["webp", "avif", "jpeg"],
    "security_warnings": []
  }

SIDE EFFECTS:
  - Writes storage module under src/storage/
  - Creates bucket (if not exists) with versioning + lifecycle + CORS
  - Provisions Lambda function (AWS) or Worker (Cloudflare) for image processing
  - Adds required env vars to .env.example
  - Registers /uploads/sign and /uploads/complete routes
```

## CLI

```bash
# Autonomous: pick backend, scaffold client + uploads + signed URLs
python3 scripts/storage_agent.py setup \
  --framework fastapi \
  --backend s3 \
  --bucket myapp-uploads \
  --region us-east-1 \
  --image-processing \
  --cdn-domain cdn.example.com

# Provision the bucket with versioning + lifecycle + CORS
python3 scripts/storage_agent.py provision-bucket \
  --bucket myapp-uploads \
  --versioning \
  --lifecycle standard_ia:30,glacier:90,expire_temp:7 \
  --cors-origins https://example.com

# Generate a presigned upload URL (server-side)
python3 scripts/storage_agent.py sign-upload \
  --key uploads/user-42/avatar.jpg \
  --content-type image/jpeg \
  --max-size-mb 5 \
  --expires 300

# Generate a presigned download URL (private content)
python3 scripts/storage_agent.py sign-download \
  --key uploads/user-42/private.pdf \
  --expires 900

# Deploy image processing Lambda (AWS)
python3 scripts/storage_agent.py deploy-image-lambda \
  --bucket myapp-uploads \
  --derived-bucket myapp-uploads-derived \
  --variants original,large,medium,thumbnail \
  --formats webp,avif,jpeg

# Copy objects between backends (for migration)
python3 scripts/storage_agent.py migrate \
  --from-backend minio \
  --from-bucket legacy-uploads \
  --to-backend s3 \
  --to-bucket myapp-uploads \
  --prefix uploads/

# Audit: grep for public buckets, secrets in metadata, server-proxied uploads
python3 scripts/storage_agent.py audit --path src/
```

## Decision Tree (autonomous)

```
Q1: Which cloud is the app deployed on?
  AWS
    → S3 (native, best SDK support, CloudFront CDN)
  Cloudflare (Workers / Pages)
    → R2 (S3-compatible, ZERO egress fees — major cost win)
  GCP
    → GCS (native, Cloud CDN)
  Azure
    → Azure Blob Storage (native, Azure CDN)
  Multi-cloud / want to avoid lock-in / cost-sensitive at high egress
    → R2 (no egress fees, S3-compatible API)
  Self-hosted / on-prem / air-gapped
    → MinIO (S3-compatible, runs anywhere)

Q2: Public read or private?
  Public read (assets, CDN-fronted images)
    → Bucket private, CDN has OAC (Origin Access Control) to bucket
      NEVER set bucket to public-read directly — CDN is the only public face
  Private (user uploads, documents)
    → Bucket private, signed URLs with short TTL (15 min default)
      Signed URL = S3 SigV4 / R2 presigned URL / GCS signed URL / SAS token (Azure)

Q3: Image processing needed?
  Yes — user-uploaded images need resize/optimize
    → AWS: S3 trigger → Lambda (sharp) → derived bucket
    → Cloudflare: Workers + Image Resizing (paid feature) or R2 + Worker
    → GCS: Cloud Function trigger → derived bucket
    → Azure: Blob Trigger → Azure Function → derived container
    Always: generate responsive variants, output WebP+AVIF+JPEG fallback,
            strip EXIF by default (location privacy)
  No (PDFs, documents, non-image)
    → Skip image processing, store as-is

Q4: Direct upload or server-proxied?
  Almost always: presigned URL direct upload
    → Server signs URL, client uploads directly to S3/R2/GCS
      Server never sees the bytes — saves bandwidth, memory, time
      Required for files > 10MB; recommended for all
  Server-proxied (only when)
    → File needs server-side virus scan BEFORE storage (rare)
    → File needs server-side encryption with customer key (rare)
    → File is < 1MB and you want simpler client code (lazy, but acceptable)

Q5: CDN in front?
  Yes — always for production
    → CloudFront (AWS), Cloudflare (any backend), Fastly, Cloud CDN (GCP)
      CDN caches at edge, reduces origin egress (and cost)
      Public read via CDN only — bucket stays private
  No — only for dev/local
    → Direct S3/R2 URL is fine for local testing, never production

Q6: Storage class / lifecycle?
  Hot (frequent access) — first 30 days → STANDARD
  Warm (infrequent access) — 30-90 days → STANDARD_IA (S3) / Nearline (GCS)
  Cold (archive) — 90+ days → GLACIER (S3) / Coldline (GCS)
  Temp uploads (never completed) — expire after 7 days
```

## Failure Modes & Recovery

| Symptom                                      | Cause                                                                         | Recovery                                                                                                   |
| -------------------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `403 Forbidden` on presigned upload          | URL expired, or content-type mismatch, or bucket CORS missing                 | Increase `--expires`; ensure client sends exact `Content-Type` header; add CORS rule for `PUT` from origin |
| Upload completes but file is public          | Bucket policy allows `s3:GetObject` to `*`                                    | Tighten bucket policy to private; serve via CDN with OAC                                                   |
| Image processing Lambda times out            | Image too large (>10MB) or sharp concurrency exhausted                        | Increase Lambda timeout to 30s, set memory to 1536MB, add SQS queue as buffer                              |
| EXIF not stripped                            | Lambda/Worker missing `sharp.rotate().resize()` without `withMetadata: false` | Add `withMetadata: false` (or `strip` flag in ImageMagick)                                                 |
| Signed URL leaked, file accessed by attacker | URL shared or logged                                                          | Reduce TTL to 5 min for sensitive files; rotate credentials; use IP-restricted signed URLs if supported    |
| Egress costs explode                         | Bucket accessed directly, no CDN                                              | Add CloudFront/Cloudflare in front; verify `x-cache: Hit` in response headers                              |
| `SlowDown` / 503 on high-volume uploads      | Burst exceeds bucket rate limit                                               | Add client-side exponential backoff; S3 supports 3,500 PUT/s per partition — use prefix hashing if higher  |
| Lost object due to overwrite                 | Versioning disabled                                                           | Enable versioning immediately (recoverable within 90 days via MFA delete); never disable on prod           |
| Migrate stuck on large bucket                | Sequential copy                                                               | Parallelize with `aws s3 sync --quiet` or `rclone copy` with `--transfers 32`                              |

## Self-Healing Loop

Every storage incident (presigned URL failure, image processing timeout, egress cost spike, public bucket exposure) writes a structured record to `OMNIPROJECT_SELF_IMPROVEMENT.md`:

```
- flow: user_avatar_upload
  failure_class: presigned_url_403
  trigger: 12% of uploads failing with 403 on PUT
  recovery: bucket CORS missing PUT method — added CORS rule with explicit method+origin
  rule_added: file-storage sub-skill now emits a CORS verification step in provision-bucket
```

`meta-auditor` reads these in Phase 13. If the same failure class appears ≥3 times across projects, `self-patch-generator` produces a rule that auto-adds the CORS check.

For public-bucket exposure specifically: if the audit finds a bucket policy allowing `s3:GetObject` to `*` without a CDN OAC, Phase 11 halts — public buckets are a release blocker (data leak risk).

## Quality Gates (enforced before declaring "storage ready")

- [ ] Bucket is **private** (no public-read policy); public access via CDN OAC only
- [ ] Versioning enabled on the bucket
- [ ] Lifecycle policy set (STANDARD_IA / GLACIER / EXPIRE)
- [ ] CORS configured for the app's origins, only the methods needed (PUT for upload)
- [ ] Presigned upload URL has TTL ≤ 5 min for sensitive, ≤ 15 min for general
- [ ] Server never proxies upload bytes (grep for `multer`, `multipart` middleware that reads file into memory — exception only for < 1MB)
- [ ] Image processing strips EXIF by default (unless explicitly retained)
- [ ] Image variants include WebP and AVIF (with JPEG fallback)
- [ ] CDN in front for production (verify `x-cache: Hit` header)
- [ ] No secrets in S3 metadata (metadata is not encrypted — use tags or a sidecar DB record)
- [ ] Signed URLs for private content, short TTL, IP restriction if supported
- [ ] Multipart upload for files > 100MB (presigned multipart, not single PUT)
- [ ] Tests cover: upload via presigned URL, download via signed URL, image processing produces variants, EXIF stripped, expired URL returns 403, public bucket access blocked

If any gate fails: status = `error`, do not proceed to Phase 9. Storage bugs cause data loss or leaks — both are release blockers.

## Tools

- **AWS S3** (`@aws-sdk/client-s3`, `boto3`) — industry default. Pair with CloudFront for CDN.
- **Cloudflare R2** (`@aws-sdk/client-s3` with R2 endpoint, or `wrangler`) — S3-compatible, zero egress fees. Pair with Cloudflare CDN.
- **MinIO** (`minio` npm / `minio` pip) — self-hosted S3-compatible. Use for on-prem/air-gapped.
- **Google Cloud Storage** (`@google-cloud/storage`) — GCP native. Pair with Cloud CDN.
- **Azure Blob Storage** (`@azure/storage-blob`) — Azure native. Pair with Azure CDN.
- **sharp** (Node) / `Pillow` (Python) — image resize/optimize. Use in Lambda/Function/Worker.
- **Cloudflare Workers + Image Resizing** — edge image processing, no Lambda cold start.
- **rclone** — copy between backends, migrate, sync. Critical for migrations.
- **aws-cli** / `gcloud storage` / `az storage` — admin operations, lifecycle policies, CORS.

## Permissions

- Filesystem: write to `src/storage/`, `.env.example`, migrations directory, `lambda/` or `worker/` for image processing
- Network: outbound HTTPS to storage backend (`*.s3.*.amazonaws.com`, `*.r2.cloudflarestorage.com`, `storage.googleapis.com`, `*.blob.core.windows.net`)
- Secrets: read storage credentials from env / IAM role only; never log; never commit
- Processes: may invoke `npm install` / `pip install` for official SDKs only; may invoke `aws s3` / `rclone` for migrations
- Cloud resources: may create buckets, Lambda functions, Workers, CDN distributions — all tagged `managed-by=omniproject`

## Hard Rules

1. **Never store secrets in S3/R2 object metadata.** Metadata is not encrypted at rest by default, is visible in bucket listings, and is often logged. Store secrets in a sidecar DB record or a secret manager — never as object metadata.
2. **Always enable versioning on production buckets.** Without versioning, an overwrite or delete is irreversible. Versioning + MFA delete is the only safe default for production data.
3. **Always set lifecycle policies.** Without lifecycle, storage costs grow unbounded. Standard pattern: STANDARD_IA @30d, GLACIER @90d, EXPIRE temp @7d. Tune per use case but never leave empty.
4. **Never expose a bucket publicly without a CDN in front.** Public buckets are directly attackable (scraping, cost amplification) and bypass CDN caching (egress costs). Use CDN with Origin Access Control — the CDN is the only public face.
5. **Always use presigned URLs for client uploads.** Server-proxied uploads waste bandwidth and memory, and limit file size to what the server can buffer. Presigned URL = client uploads directly, server signs only.
6. **Always strip EXIF from user-uploaded images by default.** EXIF contains GPS coordinates, device IDs, and timestamps. Failing to strip = location privacy breach. Retain EXIF only if the user explicitly opts in (e.g. photo-sharing app).
7. **Never log presigned URLs.** A logged presigned URL is a temporary credential. Log the object key and the request ID, never the URL itself. If a URL is logged, rotate by expiring it (short TTL) and audit access.
8. **Always generate responsive image variants and modern formats.** Single-JPEG uploads waste bandwidth on mobile. Generate `original/large/medium/thumbnail` in WebP + AVIF + JPEG; serve via `<picture>` element with `srcset`.
9. **Never use server-proxied upload for files > 1MB.** Proxying large uploads through the app server causes memory pressure, slow response times, and timeouts. Always presigned-URL for > 1MB; ideally for all sizes.
10. **Always set a max upload size and enforce it.** Presigned URL conditions must include `content-length-range`. Without it, a client can upload a 100GB file to a 5MB-expected slot — denial-of-wallet attack.
