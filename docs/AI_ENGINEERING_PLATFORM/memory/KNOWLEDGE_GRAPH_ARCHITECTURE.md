# Knowledge Graph Architecture

> **Purpose:** Define the relationship graph connecting all platform entities.
> **Scope:** Node types, edge types, traversal strategies, graph queries, relationship inference.

---

## 1. Knowledge Graph Overview

The Knowledge Graph is a relationship graph that connects all entities in the AI Engineering Platform. It enables:
- **Impact analysis:** What will changing this spec affect?
- **Decision tracing:** Why was this architecture choice made?
- **Pattern discovery:** What patterns recur across pipelines?
- **Dependency resolution:** What does this pipeline depend on?
- **Root cause analysis:** What caused this failure?

---

## 2. Graph Schema

### 2.1 Node Types

| Node Type | ID Pattern | Properties | Example |
|---|---|---|---|
| `Spec` | `spec-{number}` | title, phase, status, createdAt | `spec-001` |
| `Phase` | `phase-{number}` | name, startDate, endDate, status | `phase-1` |
| `ADR` | `adr-{number}` | title, status, decision, createdAt | `adr-003` |
| `Pipeline` | `pipeline-{uuid}` | specId, state, createdAt, duration | `pipeline-abc123` |
| `Session` | `session-{uuid}` | role, stage, state, duration | `session-def456` |
| `Review` | `review-{uuid}` | type, status, findings | `review-ghi789` |
| `Verification` | `verification-{uuid}` | checks, overall, duration | `verification-jkl012` |
| `Failure` | `failure-{uuid}` | type, stage, strategy, resolved | `failure-mno345` |
| `Branch` | `branch-{name}` | baseBranch, commitSha, createdAt | `branch-feat/001-upload` |
| `PullRequest` | `pr-{number}` | title, status, mergedAt | `pr-42` |
| `Artifact` | `artifact-{uuid}` | type, schema, createdAt | `artifact-plan-001` |
| `Decision` | `decision-{uuid}` | title, rationale, status | `decision-redis-rate-limit` |
| `Pattern` | `pattern-{uuid}` | name, description, frequency | `pattern-middleware-auth` |
| `Convention` | `convention-{uuid}` | category, rule, source | `convention-rtl-first` |

### 2.2 Edge Types

| Edge Type | From | To | Properties | Meaning |
|---|---|---|---|---|
| `BELONGS_TO` | Spec | Phase | — | Spec belongs to phase |
| `IMPLEMENTED_BY` | Spec | Pipeline | confidence | Spec implemented by pipeline |
| `GENERATED` | Pipeline | Session | role, stage | Pipeline generated session |
| `PRODUCED` | Session | Artifact | type | Session produced artifact |
| `REFERENCES` | ADR | Spec | context | ADR references spec |
| `SUPERSEDES` | ADR | ADR | reason | ADR supersedes another ADR |
| `DEPENDS_ON` | Pipeline | Pipeline | type | Pipeline depends on another |
| `TRIGGERED` | Pipeline | Verification | stage | Pipeline triggered verification |
| `TRIGGERED` | Pipeline | Review | stage | Pipeline triggered review |
| `FOUND` | Verification | Failure | severity | Verification found failure |
| `FOUND` | Review | Failure | severity | Review found failure |
| `RESOLVED_BY` | Failure | Session | strategy | Failure resolved by session |
| `CREATED` | Pipeline | Branch | — | Pipeline created branch |
| `CREATED` | Pipeline | PullRequest | — | Pipeline created PR |
| `MERGED_INTO` | PullRequest | Branch | commitSha | PR merged into branch |
| `EXTRACTED_FROM` | Decision | Session | confidence | Decision extracted from session |
| `EXTRACTED_FROM` | Pattern | Pipeline | confidence | Pattern extracted from pipeline |
| `FOLLOWS` | Pipeline | Convention | — | Pipeline follows convention |
| `CAUSED_BY` | Failure | Failure | — | Failure caused by another failure |
| `RELATED_TO` | Spec | Spec | similarity | Spec is related to another |
| `SIMILAR_TO` | Pattern | Pattern | similarity | Pattern is similar to another |

### 2.3 Graph Visualization

```
                    ┌──────────┐
                    │  Phase   │
                    │ phase-1  │
                    └────┬─────┘
                         │ BELONGS_TO
                    ┌────┴─────┐
                    │   Spec   │
                    │ spec-001 │
                    └────┬─────┘
                         │ IMPLEMENTED_BY
                    ┌────┴─────┐
                    │ Pipeline │
                    │ p-abc123 │──────CREATED──────► Branch
                    └────┬─────┘                     feat/001-upload
                         │
              ┌──────────┼──────────┐
              │          │          │
        GENERATED   TRIGGERED  TRIGGERED
              │          │          │
         ┌────┴────┐ ┌───┴────┐ ┌──┴──────┐
         │ Session │ │ Verify │ │ Review  │
         │coder,s5 │ │ v-001  │ │ r-001   │
         └────┬────┘ └───┬────┘ └──┬──────┘
              │          │         │
        PRODUCED    FOUND       FOUND
              │          │         │
         ┌────┴────┐ ┌───┴────┐ ┌──┴──────┐
         │Artifact │ │Failure │ │Failure  │
         │plan-001 │ │ f-001  │ │ f-002   │
         └─────────┘ └───┬────┘ └──┬──────┘
                         │         │
                   RESOLVED_BY     │
                         │         │
                    ┌────┴────┐    │
                    │ Session │    │
                    │recovery │    │
                    └─────────┘    │
                                   │
                            RELATED_TO (inferred)
```

---

## 3. Graph Operations

### 3.1 Graph API

```typescript
interface KnowledgeGraphAPI {
  // Node operations
  addNode(type: NodeType, id: string, properties: Record<string, unknown>): Promise<void>;
  getNode(id: string): Promise<GraphNode>;
  updateNode(id: string, properties: Record<string, unknown>): Promise<void>;
  deleteNode(id: string): Promise<void>;

  // Edge operations
  addEdge(from: string, to: string, type: EdgeType, properties?: Record<string, unknown>): Promise<void>;
  getEdges(nodeId: string, direction?: 'in' | 'out' | 'both'): Promise<GraphEdge[]>;
  removeEdge(from: string, to: string, type: EdgeType): Promise<void>;

  // Traversal
  traverse(startId: string, maxDepth: number, edgeFilter?: EdgeType[]): Promise<SubGraph>;
  findPath(fromId: string, toId: string, maxDepth: number): Promise<GraphPath | null>;
  findNeighbors(nodeId: string, edgeType?: EdgeType): Promise<GraphNode[]>;

  // Queries
  querySpecsByPhase(phaseId: string): Promise<GraphNode[]>;
  queryPipelinesBySpec(specId: string): Promise<GraphNode[]>;
  queryFailuresByType(failureType: string): Promise<GraphNode[]>;
  queryRelatedSpecs(specId: string, minSimilarity: number): Promise<GraphNode[]>;
  queryDecisionsByTag(tag: string): Promise<GraphNode[]>;
  queryPatternsByFrequency(minFrequency: number): Promise<GraphNode[]>;

  // Analysis
  getImpactAnalysis(nodeId: string): Promise<ImpactReport>;
  getDecisionTrail(nodeId: string): Promise<DecisionTrail>;
  getFailureChain(failureId: string): Promise<FailureChain>;
  getPipelineLineage(pipelineId: string): Promise<PipelineLineage>;
}
```

### 3.2 Traversal Strategies

| Strategy | Use Case | Algorithm |
|---|---|---|
| Breadth-first | Impact analysis (what's affected) | BFS with depth limit |
| Depth-first | Decision tracing (why was this decided) | DFS with path tracking |
| Shortest path | Dependency resolution | BFS or Dijkstra |
| PageRank | Pattern importance | Iterative PageRank |
| Community detection | Related spec clustering | Louvain method |

### 3.3 Common Queries

**Impact Analysis:**
```typescript
async function getImpactAnalysis(specId: string): Promise<ImpactReport> {
  const subgraph = await graph.traverse(specId, 3, ['IMPLEMENTED_BY', 'DEPENDS_ON', 'REFERENCES']);

  return {
    affectedPipelines: subgraph.nodes.filter(n => n.type === 'Pipeline'),
    affectedSpecs: subgraph.nodes.filter(n => n.type === 'Spec'),
    affectedADRs: subgraph.nodes.filter(n => n.type === 'ADR'),
    totalNodes: subgraph.nodes.length,
    totalEdges: subgraph.edges.length,
  };
}
```

**Decision Trail:**
```typescript
async function getDecisionTrail(nodeId: string): Promise<DecisionTrail> {
  const path = await graph.findPath(nodeId, 'decision-root', 5);

  return {
    decisions: path.nodes.filter(n => n.type === 'Decision'),
    adrs: path.nodes.filter(n => n.type === 'ADR'),
    sessions: path.nodes.filter(n => n.type === 'Session'),
    rationale: path.edges.map(e => e.properties?.rationale).filter(Boolean),
  };
}
```

**Failure Chain:**
```typescript
async function getFailureChain(failureId: string): Promise<FailureChain> {
  const chain = await graph.traverse(failureId, 4, ['CAUSED_BY', 'RESOLVED_BY', 'FOUND']);

  return {
    rootCause: chain.nodes.find(n => n.type === 'Failure' && !chain.edges.some(e => e.to === n.id)),
    cascadingFailures: chain.nodes.filter(n => n.type === 'Failure' && n.id !== failureId),
    resolutions: chain.nodes.filter(n => n.type === 'Session'),
    verifications: chain.nodes.filter(n => n.type === 'Verification'),
  };
}
```

---

## 4. Graph Persistence

### 4.1 Storage Strategy

| Phase | Storage | Rationale |
|---|---|---|
| Phase 0 | JSON files (adjacency list) | No dependencies, simple |
| Phase 1+ | PostgreSQL (relational tables) | Queryable, persistent |
| Future | Neo4j or similar graph DB | Native graph operations |

### 4.2 JSON File Structure (Phase 0)

```
.opencode/graph/
├── nodes/
│   ├── spec-001.json
│   ├── spec-002.json
│   ├── adr-001.json
│   ├── pipeline-abc123.json
│   └── ...
├── edges/
│   ├── spec-001.jsonl       # All edges from spec-001
│   ├── pipeline-abc123.jsonl
│   └── ...
├── indexes/
│   ├── by-type.jsonl        # Node IDs indexed by type
│   ├── by-phase.jsonl       # Node IDs indexed by phase
│   └── by-tag.jsonl         # Node IDs indexed by tag
└── metadata.json            # Graph metadata, version, checksum
```

### 4.3 Node JSON Format

```json
{
  "id": "spec-001",
  "type": "Spec",
  "properties": {
    "title": "File Upload System",
    "phase": "phase-1",
    "status": "implemented",
    "createdAt": "2026-05-20T10:00:00Z"
  },
  "edges": [
    { "type": "BELONGS_TO", "to": "phase-1" },
    { "type": "IMPLEMENTED_BY", "to": "pipeline-abc123", "properties": { "confidence": 0.95 } }
  ],
  "metadata": {
    "createdAt": "2026-05-20T10:00:00Z",
    "updatedAt": "2026-05-20T11:30:00Z",
    "version": 2
  }
}
```

---

## 5. Relationship Inference

### 5.1 Inferred Relationships

Some relationships are not explicitly created but can be inferred:

| Inferred Edge | Source Nodes | Inference Rule |
|---|---|---|
| `RELATED_TO` (Spec ↔ Spec) | Two specs sharing patterns | Same pattern extracted from both |
| `SIMILAR_TO` (Pattern ↔ Pattern) | Two patterns with similar descriptions | Semantic similarity > 0.8 |
| `CAUSED_BY` (Failure ↔ Failure) | Two failures in same pipeline, sequential | Second failure occurred after first |
| `DEPENDS_ON` (Pipeline ↔ Pipeline) | Pipeline B spec references Pipeline A output | Spec dependency chain |
| `FOLLOWS` (Pipeline ↔ Convention) | Pipeline uses pattern matching convention | Pattern-convention match |

### 5.2 Inference Engine

```typescript
interface InferenceEngine {
  // Run inference on new node
  inferRelationships(newNode: GraphNode): Promise<InferredEdge[]>;

  // Run inference on graph changes
  onGraphChange(change: GraphChange): Promise<InferredEdge[]>;

  // Batch inference (periodic)
  runBatchInference(): Promise<InferredEdge[]>;
}

// Example inference rule
function inferSpecRelationships(specA: SpecNode, specB: SpecNode): InferredEdge | null {
  const sharedPatterns = findSharedPatterns(specA, specB);
  if (sharedPatterns.length >= 2) {
    return {
      type: 'RELATED_TO',
      from: specA.id,
      to: specB.id,
      properties: { similarity: calculateSimilarity(specA, specB), sharedPatterns },
      confidence: 0.7 + (sharedPatterns.length * 0.1),
    };
  }
  return null;
}
```

---

## 6. Graph Events

| Event | Payload | Emitted When |
|---|---|---|
| `GRAPH_NODE_CREATED` | `{nodeId, type, properties}` | New node added |
| `GRAPH_NODE_UPDATED` | `{nodeId, changes}` | Node properties updated |
| `GRAPH_EDGE_CREATED` | `{from, to, type, properties}` | New edge added |
| `GRAPH_EDGE_REMOVED` | `{from, to, type}` | Edge removed |
| `GRAPH_INFERRED_EDGES` | `{edges, rule}` | Inferred edges created |
| `GRAPH_TRAVERSAL` | `{startId, depth, resultCount}` | Traversal completed |
| `GRAPH_QUERY` | `{queryType, resultCount, duration}` | Query completed |

---

## 7. Graph Anti-Patterns

| Anti-Pattern | Problem | Prevention |
|---|---|---|
| Orphaned nodes | Nodes with no edges | Validate edges on node creation |
| Cyclic dependencies | Infinite traversal loops | Depth limits, cycle detection |
| Stale edges | Edges pointing to deleted nodes | Cascade delete or edge cleanup |
| No indexing | Slow queries | Maintain type/phase/tag indexes |
| Over-inference | Too many false relationships | Confidence thresholds |
| No graph versioning | Cannot track graph evolution | Version metadata on nodes |
| Missing critical edges | Incomplete impact analysis | Mandatory edge creation rules |
