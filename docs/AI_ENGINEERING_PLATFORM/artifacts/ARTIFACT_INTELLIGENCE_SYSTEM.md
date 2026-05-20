# Artifact Intelligence System

> **Purpose:** Define the artifact lifecycle management system for the AI Engineering Platform.
> **Scope:** Artifact types, lifecycle, indexing, retrieval, versioning, analysis.

---

## 1. Artifact Overview

Artifacts are structured outputs produced by the platform during pipeline execution. They include:
- Implementation plans
- Code changes
- Review results
- Verification reports
- Repair reports
- Governance decisions
- PR summaries
- Screenshots
- Session transcripts
- Checkpoints

The Artifact Intelligence System manages the full lifecycle of these artifacts: creation, validation, indexing, storage, retrieval, versioning, and analysis.

---

## 2. Artifact Taxonomy

### 2.1 Artifact Types

| Type | Schema | Producer | Consumer | Retention |
|---|---|---|---|---|
| `ImplementationPlan` | Plan schema | Architect session | Coder session, Pipeline engine | 90 days |
| `CodeChange` | Code change schema | Coder session | GitHub automation, Reviewer | 90 days |
| `ReviewResult` | Review schema | Reviewer session | Pipeline engine, PR body | 90 days |
| `VerificationResult` | Verification schema | Verification engine | Pipeline engine, Repair engine | 90 days |
| `RepairReport` | Repair schema | Recovery session | Pipeline engine, Memory | 90 days |
| `GateResult` | Governance schema | Governance session | Pipeline engine | 180 days |
| `PRSummary` | PR schema | GitHub automation | PR body, Changelog | 180 days |
| `Screenshot` | None (binary) | Playwright | Review, Repair, Archive | 30 days |
| `SessionTranscript` | None (JSONL) | Session manager | Replay, Debug, Audit | 90 days |
| `Checkpoint` | Checkpoint schema | Pipeline engine | Recovery, Replay | 90 days |
| `ChangelogEntry` | Changelog schema | GitHub automation | Release notes | Indefinite |
| `ADRDraft` | ADR schema | Architect session | Project memory, Knowledge graph | Indefinite |

### 2.2 Artifact Classification

| Classification | Criteria | Storage |
|---|---|---|
| **Structured** | JSON schema-validated | JSON files, PostgreSQL |
| **Binary** | Screenshots, videos | File system, MinIO |
| **Log** | Session transcripts, event logs | JSONL files |
| **Derived** | Reports, summaries, analytics | Generated on demand |

---

## 3. Artifact Lifecycle

### 3.1 Lifecycle States

```
                    ┌─────────────┐
                    │  CREATED    │ ← Artifact produced by session/engine
                    └──────┬──────┘
                           │ validate()
                           ▼
                    ┌─────────────┐
                    │  VALIDATING │ ← Schema validation
                    └──────┬──────┘
                           │
                    ┌──────┴──────┐
                    │             │
                    ▼             ▼
              ┌──────────┐  ┌──────────┐
              │ VALIDATED│  │ INVALID  │ → Regenerate or discard
              └────┬─────┘  └──────────┘
                   │ index()
                   ▼
              ┌─────────────┐
              │   INDEXED   │ ← Added to artifact index
              └──────┬──────┘
                     │ consume()
                     ▼
              ┌─────────────┐
              │   ACTIVE    │ ← Being used by downstream components
              └──────┬──────┘
                     │
              ┌──────┴──────┐
              │             │
              ▼             ▼
        ┌──────────┐  ┌──────────┐
        │ ARCHIVED │  │ EXPIRED  │ → Deleted per retention policy
        └────┬─────┘  └──────────┘
             │
             ▼
        ┌──────────┐
        │ANALYZED  │ ← Used for pattern analysis, metrics
        └──────────┘
```

### 3.2 Lifecycle Events

| Event | Trigger | Action |
|---|---|---|
| `ARTIFACT_CREATED` | Session/engine produces artifact | Store raw artifact |
| `ARTIFACT_VALIDATED` | Schema validation passes | Mark as valid |
| `ARTIFACT_INVALID` | Schema validation fails | Request regeneration |
| `ARTIFACT_INDEXED` | Added to artifact index | Update search index |
| `ARTIFACT_CONSUMED` | Downstream component uses artifact | Log consumption |
| `ARTIFACT_ARCHIVED` | Pipeline completes | Move to archive storage |
| `ARTIFACT_EXPIRED` | Retention period exceeded | Delete artifact |

---

## 4. Artifact Storage

### 4.1 Storage Layout

```
.artifacts/
├── pipelines/
│   ├── {pipeline-id}/
│   │   ├── plan.json              # ImplementationPlan
│   │   ├── code-change.json       # CodeChange
│   │   ├── verification.json      # VerificationResult
│   │   ├── review.json            # ReviewResult
│   │   ├── repair.json            # RepairReport (if any)
│   │   ├── pr-summary.json        # PRSummary
│   │   ├── gate-result.json       # GateResult
│   │   ├── screenshots/           # Playwright screenshots
│   │   │   ├── visual-diff.png
│   │   │   └── rtl-layout.png
│   │   └── transcript.jsonl       # Session transcripts
│   └── ...
├── sessions/
│   ├── {session-id}/
│   │   ├── transcript.jsonl
│   │   ├── tool-calls.jsonl
│   │   └── context-snapshot.json
│   └── ...
├── index/
│   ├── by-type.jsonl              # Artifact IDs indexed by type
│   ├── by-pipeline.jsonl          # Artifact IDs indexed by pipeline
│   ├── by-spec.jsonl              # Artifact IDs indexed by spec
│   └── by-date.jsonl              # Artifact IDs indexed by date
├── archive/
│   ├── {year}/{month}/
│   │   └── {pipeline-id}/         # Archived pipeline artifacts
│   └── ...
└── metadata.json                  # Artifact registry metadata
```

### 4.2 Artifact Metadata

```typescript
interface ArtifactMetadata {
  id: string;
  type: ArtifactType;
  pipelineId: string;
  sessionId: string | null;
  stage: string;
  schema: string;           // Schema name used for validation
  schemaVersion: string;
  sizeBytes: number;
  createdAt: string;
  validatedAt: string | null;
  indexedAt: string | null;
  consumedBy: string[];     // Component IDs that consumed this artifact
  archivedAt: string | null;
  expiresAt: string | null;
  checksum: string;         // SHA-256 of artifact content
  tags: string[];           // Searchable tags
}
```

---

## 5. Artifact Indexing

### 5.1 Index Structure

Artifacts are indexed for fast retrieval and search:

```typescript
interface ArtifactIndex {
  // By type
  byType: Map<ArtifactType, string[]>;

  // By pipeline
  byPipeline: Map<string, string[]>;

  // By spec
  bySpec: Map<string, string[]>;

  // By date
  byDate: Map<string, string[]>;  // YYYY-MM-DD → artifact IDs

  // By tag
  byTag: Map<string, string[]>;

  // Full-text search (simple inverted index for Phase 0)
  fullText: Map<string, string[]>;  // term → artifact IDs
}
```

### 5.2 Indexing Process

```
Artifact Validated
  │
  ▼
1. Extract metadata (type, pipeline, spec, tags)
  │
  ▼
2. Update type index
  │
  ▼
3. Update pipeline index
  │
  ▼
4. Update spec index
  │
  ▼
5. Update date index
  │
  ▼
6. Extract searchable text and update full-text index
  │
  ▼
7. Update knowledge graph (create artifact node)
  │
  ▼
8. Emit ARTIFACT_INDEXED event
```

### 5.3 Search API

```typescript
interface ArtifactSearchAPI {
  // Basic queries
  findByType(type: ArtifactType): Promise<ArtifactMetadata[]>;
  findByPipeline(pipelineId: string): Promise<ArtifactMetadata[]>;
  findBySpec(specId: string): Promise<ArtifactMetadata[]>;
  findByDateRange(start: string, end: string): Promise<ArtifactMetadata[]>;
  findByTag(tag: string): Promise<ArtifactMetadata[]>;

  // Full-text search
  search(query: string, filters?: SearchFilters): Promise<ArtifactMetadata[]>;

  // Advanced queries
  findLatestByType(type: ArtifactType, limit: number): Promise<ArtifactMetadata[]>;
  findFailedArtifacts(): Promise<ArtifactMetadata[]>;
  findArtifactsWithErrors(): Promise<ArtifactMetadata[]>;
}
```

---

## 6. Artifact Analysis

### 6.1 Analysis Types

| Analysis | Purpose | Input | Output |
|---|---|---|---|
| **Pattern Analysis** | Identify recurring patterns across artifacts | All artifacts of a type | Pattern report |
| **Trend Analysis** | Track metrics over time | Artifact metadata + metrics | Trend report |
| **Quality Analysis** | Assess artifact quality | Review results, verification results | Quality score |
| **Impact Analysis** | Assess impact of changes | Code changes, review results | Impact report |
| **Failure Analysis** | Analyze failure patterns | Repair reports, failure nodes | Failure patterns |

### 6.2 Pattern Analysis

```typescript
interface PatternAnalysis {
  pattern: string;
  frequency: number;
  artifacts: string[];  // Artifact IDs exhibiting this pattern
  firstSeen: string;
  lastSeen: string;
  confidence: number;
  examples: string[];   // Representative artifact IDs
}

async function analyzePatterns(artifactType: ArtifactType): Promise<PatternAnalysis[]> {
  const artifacts = await artifactAPI.findByType(artifactType);
  const patterns = new Map<string, PatternAnalysis>();

  for (const artifact of artifacts) {
    const content = await artifactAPI.load(artifact.id);
    const extractedPatterns = extractPatterns(content);

    for (const pattern of extractedPatterns) {
      if (!patterns.has(pattern.name)) {
        patterns.set(pattern.name, {
          pattern: pattern.name,
          frequency: 0,
          artifacts: [],
          firstSeen: artifact.createdAt,
          lastSeen: artifact.createdAt,
          confidence: pattern.confidence,
          examples: [],
        });
      }

      const analysis = patterns.get(pattern.name)!;
      analysis.frequency++;
      analysis.artifacts.push(artifact.id);
      analysis.lastSeen = artifact.createdAt;
      if (analysis.examples.length < 3) {
        analysis.examples.push(artifact.id);
      }
    }
  }

  return Array.from(patterns.values())
    .filter(p => p.frequency >= 2)
    .sort((a, b) => b.frequency - a.frequency);
}
```

### 6.3 Quality Scoring

```typescript
interface QualityScore {
  artifactId: string;
  overall: number;  // 0-100
  dimensions: {
    completeness: number;   // All required fields present
    correctness: number;    // Passes validation
    consistency: number;    // Consistent with related artifacts
    clarity: number;        // Human-readable and well-structured
  };
  issues: string[];
}

function calculateQualityScore(artifact: Artifact, relatedArtifacts: Artifact[]): QualityScore {
  const completeness = calculateCompleteness(artifact);
  const correctness = artifact.validated ? 100 : 0;
  const consistency = calculateConsistency(artifact, relatedArtifacts);
  const clarity = calculateClarity(artifact);

  return {
    artifactId: artifact.id,
    overall: (completeness * 0.3 + correctness * 0.3 + consistency * 0.2 + clarity * 0.2),
    dimensions: { completeness, correctness, consistency, clarity },
    issues: identifyIssues(artifact),
  };
}
```

---

## 7. Artifact Versioning

### 7.1 Version Strategy

Artifacts are versioned when they are regenerated or updated:

| Version | Trigger | Strategy |
|---|---|---|
| v1 | Initial creation | New artifact |
| v2 | Regeneration (schema validation failure) | New version, keep old |
| v3 | Repair loop update | New version, keep old |
| vN | Subsequent updates | New version, keep old |

### 7.2 Version Metadata

```typescript
interface ArtifactVersion {
  artifactId: string;
  version: number;
  content: unknown;
  createdAt: string;
  createdBy: string;  // Session ID
  reason: string;     // Why this version was created
  previousVersion: number | null;
  checksum: string;
}
```

### 7.3 Version Retention

| Version | Retention | Rationale |
|---|---|---|
| Latest | Until artifact expires | Active use |
| Previous 2 | Until artifact expires | Rollback reference |
| Older | 30 days | Audit only |

---

## 8. Artifact Events

| Event | Payload | Emitted When |
|---|---|---|
| `ARTIFACT_CREATED` | `{artifactId, type, pipelineId, stage}` | Artifact produced |
| `ARTIFACT_VALIDATED` | `{artifactId, schema, version}` | Schema validation passed |
| `ARTIFACT_INVALID` | `{artifactId, schema, errors}` | Schema validation failed |
| `ARTIFACT_INDEXED` | `{artifactId, indexes}` | Artifact indexed |
| `ARTIFACT_CONSUMED` | `{artifactId, consumer}` | Artifact consumed |
| `ARTIFACT_ARCHIVED` | `{artifactId, archivePath}` | Artifact archived |
| `ARTIFACT_EXPIRED` | `{artifactId, reason}` | Artifact deleted |
| `ARTIFACT_VERSIONED` | `{artifactId, version, reason}` | New version created |

---

## 9. Artifact Anti-Patterns

| Anti-Pattern | Problem | Prevention |
|---|---|---|
| No validation | Garbage artifacts downstream | Mandatory schema validation |
| No indexing | Cannot find artifacts | Automatic indexing on validation |
| No retention policy | Storage bloat | Configurable retention per type |
| No versioning | Cannot track changes | Version on every update |
| No checksums | Undetected corruption | SHA-256 on every artifact |
| No analysis | Lost learning opportunities | Periodic pattern analysis |
| Storing binaries in JSON | Repo bloat | Separate binary storage |
