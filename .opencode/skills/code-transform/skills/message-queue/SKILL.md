---
name: message-queue
description: "Async message processing — Kafka, RabbitMQ, SQS, Redis Streams, BullMQ. Picks the broker by workload (event streaming vs task queue vs pub-sub), implements idempotent consumers with at-least-once delivery, dead letter queues, exponential backoff retry, and consumer groups. Triggers in Phase 6 EXECUTE when the app needs async work, and in Phase 2 AUDIT when Dimension 5 finds synchronous calls to slow third parties, missing retries, or work done in request handlers that should be backgrounded."
license: MIT
metadata:
  version: "1.0"
  author: OmniProject AI
  category: infra
---

# Message Queue

> Infra sub-skill for async work. Picks the broker (Kafka/RabbitMQ/SQS/Redis Streams/BullMQ), implements producers that never block on consumer health, consumers that are idempotent (at-least-once delivery is the contract), dead letter queues for poison messages, exponential backoff retry with jitter, and consumer groups for parallelism. Coordinates with `email-setup` (background sends), `payment-setup` (webhook processing), `db-design` (outbox pattern), and `error-monitoring` (DLQ alerting).

## When to Use

| Phase | Trigger | Why |
|-------|---------|-----|
| Phase 2 — AUDIT | Dimension 5 (Performance) finds request handlers calling slow third-party APIs (email, PDF gen, image processing) synchronously | User latency coupled to third-party = cascading failures |
| Phase 2 — AUDIT | Dimension 5 finds work that should be backgrounded (report generation, bulk imports, notifications) done in request handlers | User waits for work that doesn't need to block the response |
| Phase 2 — AUDIT | Dimension 4 (Reliability) finds no retries on flaky operations | Network calls fail; without retry + DLQ, you lose data |
| Phase 6 — EXECUTE | User says "add background jobs", "add queue", "add Kafka", "add BullMQ", "add SQS" | This is the executing sub-skill |
| Phase 6 — EXECUTE | Migrating brokers (RabbitMQ → Kafka, SQS → Redis Streams) | Full replace of producer + consumer layer |
| Phase 9 — ACCEPTANCE | Enqueue a test job, verify consumer processes it, verify DLQ catches poison message, verify retry happens on transient failure | Async systems fail silently — must walk the full enqueue→process→retry→DLQ loop |
| Phase 11 — ROLLOUT | Verify consumer lag is zero, DLQ is empty, monitoring alerts wired | Silent queue backup = data loss in disguise |

**Do NOT use this sub-skill for:** real-time bidirectional communication (use `realtime-setup` — WebSocket/SSE), RPC between services (use gRPC / REST — queues are for async, not request/response), or batch ETL pipelines (use a workflow engine — Airflow / Dagster / Prefect — for DAG dependencies).

## What It Does

1. Picks the broker via the Decision Tree.
2. Installs the official client: `kafkajs` / `@elastic/kibana-cli` no... `kafka-python` / `amqplib` / `@aws-sdk/client-sqs` / `ioredis` (Streams) / `bullmq` / `celery` / `langchain` no...
3. Defines the queue/topic topology:
   - **Kafka**: topics with partitions, consumer groups, offset tracking.
   - **RabbitMQ**: exchanges (direct, topic, fanout) → queues with bindings.
   - **SQS**: standard or FIFO queues, visibility timeout, redrive policy.
   - **Redis Streams**: streams with consumer groups, XREADGROUP, XPENDING.
   - **BullMQ**: queues with delayed/repeatable jobs, flows.
4. Implements producers:
   - **Never block on consumer health.** Producer's job is to enqueue; consumer's job is to process. Producer returns immediately after ack from broker.
   - **Outbox pattern** for transactional enqueue: write to DB + outbox table in same transaction; a separate poller publishes outbox rows to the broker. Guarantees no lost messages on app crash.
   - **Idempotency key** on every message: producer-generated UUID; consumer uses it to dedupe.
5. Implements consumers with these guarantees:
   - **At-least-once delivery**: messages may be redelivered; consumer MUST be idempotent.
   - **Idempotency**: consumer tracks processed `message_id` in a dedup table; skip if seen.
   - **Ack after processing**: only ack/nack AFTER work is done. Auto-ack is forbidden.
   - **Retry with exponential backoff + jitter**: 1s, 2s, 4s, 8s, 16s, 32s, 60s, 120s, 300s, 600s (max 10 attempts).
   - **DLQ on final failure**: after max retries, move to DLQ for human inspection. Never silently drop.
6. Wires consumer groups for parallelism:
   - **Kafka**: partitions per consumer in group; rebalance on add/remove.
   - **RabbitMQ**: prefetch count; multiple consumers on same queue.
   - **SQS**: visibility timeout + long polling; multiple Lambdas/workers.
   - **BullMQ**: concurrency setting per worker.
7. Implements monitoring:
   - **Lag**: messages enqueued minus messages processed. Alert if > 1000 sustained 5 min.
   - **DLQ depth**: alert if > 0 (any DLQ message is a bug).
   - **Processing time p95**: alert if > 2x baseline.
   - **Error rate**: alert if > 1% of messages failing.
8. Emits a `queue_client` for other modules: `enqueue(job_type, payload, options)`, `register_consumer(job_type, handler)`.

## Integration Contract

```
INPUT:
  - broker_hint: kafka|rabbitmq|sqs|redis_streams|bullmq (optional — decision tree decides)
  - framework: express|fastify|fastapi|django|next|rails (required)
  - queue_name: string (required — e.g. "email-sends")
  - workload: task_queue|event_stream|pub_sub (default task_queue)
  - consumer_concurrency: int (default 4)
  - max_retries: int (default 10)
  - retry_strategy: exponential_jitter (default) | fixed | linear
  - dlq_name: string (default "<queue_name>-dlq")
  - visibility_timeout_s: int (default 300 — SQS-specific)
  - use_outbox: bool (default true for transactional enqueue)

OUTPUT (JSON to stdout):
  {
    "status": "ok|error",
    "broker": "bullmq",
    "queue_name": "email-sends",
    "dlq_name": "email-sends-dlq",
    "files_created": [
      "src/queue/client.{ts,py}",
      "src/queue/producer.{ts,py}",
      "src/queue/consumer.{ts,py}",
      "src/queue/idempotency.{ts,py}",
      "src/queue/dlq.{ts,py}"
    ],
    "env_required": ["REDIS_URL", "QUEUE_PREFIX"],
    "consumer_concurrency": 4,
    "max_retries": 10,
    "retry_schedule": "1s,2s,4s,8s,16s,32s,60s,120s,300s,600s",
    "monitoring": {
      "lag_alert_threshold": 1000,
      "dlq_alert_threshold": 1,
      "error_rate_alert_threshold": 0.01
    },
    "security_warnings": []
  }

SIDE EFFECTS:
  - Writes queue module under src/queue/
  - Creates queues/topics on the broker (with DLQ)
  - Adds migrations for `outbox` and `processed_messages` (idempotency) tables
  - Adds required env vars to .env.example
  - Registers consumer workers (started via `npm run worker` / `celery worker`)
```

## CLI

```bash
# Autonomous: pick broker, scaffold producer + consumer + DLQ + idempotency
python3 scripts/queue_agent.py setup \
  --framework fastapi \
  --broker bullmq \
  --queue-name email-sends \
  --workload task_queue \
  --consumer-concurrency 4 \
  --max-retries 10

# Enqueue a job (test)
python3 scripts/queue_agent.py enqueue \
  --queue email-sends \
  --type send_password_reset \
  --payload '{"user_id":42,"reset_token":"abc"}' \
  --idempotency-key "pwd-reset-42-2024-01-15"

# Register and start a consumer
python3 scripts/queue_agent.py start-worker \
  --queue email-sends \
  --handler src/queue/handlers/email.py \
  --concurrency 4

# Inspect DLQ
python3 scripts/queue_agent.py inspect-dlq \
  --queue email-sends-dlq \
  --limit 10

# Replay a DLQ message (after fixing the bug)
python3 scripts/queue_agent.py replay-dlq \
  --queue email-sends-dlq \
  --message-id abc-123 \
  --target-queue email-sends

# Get queue stats (lag, throughput, errors)
python3 scripts/queue_agent.py stats --queue email-sends

# Audit: grep for synchronous third-party calls in request handlers, missing retries
python3 scripts/queue_agent.py audit --path src/
```

## Decision Tree (autonomous)

```
Q1: What's the workload?
  Task queue (send email, generate PDF, process upload)
    → BullMQ (Node/Redis) or Celery (Python/Redis) or SQS (AWS)
      BullMQ: best DX in Node ecosystem, delayed/repeatable jobs, flows
      Celery: best DX in Python, mature, huge ecosystem
      SQS: if AWS-native, fully managed, no Redis dependency
  Event streaming (clickstream, audit log, change data capture)
    → Kafka (or RedPanda — Kafka-compatible, lower ops)
      Kafka: industry standard, durable, replayable, exactly-once via transactions
      RedPanda: no ZooKeeper, lower ops, Kafka API compatible
  Complex routing (multiple consumers per message, topic matching)
    → RabbitMQ
      Exchanges: direct, topic, fanout, headers
      Use when routing logic is non-trivial (e.g. route by severity to different queues)
  Pub-sub fanout (multiple services subscribe to same event)
    → Kafka (consumer groups) or Redis Pub/Sub (ephemeral, no durability)
      Redis Pub/Sub: no persistence — if subscriber is offline, message lost
      Use Redis Streams instead if durability matters

Q2: At-least-once or exactly-once?
  At-least-once (default — and what you should assume)
    → Make consumers idempotent. This is the only sane default.
      All brokers in this list support at-least-once with proper ack semantics.
  Exactly-once (rare, expensive)
    → Kafka transactions (producer + consumer read-process-write pattern)
      Cost: lower throughput, complex semantics. Avoid unless truly required
      (e.g. financial ledger — and even then, idempotent at-least-once is usually fine)
  At-most-once (rare, lossy)
    → Auto-ack on receive. Only for ephemeral telemetry. Never for user-affecting work.

Q3: Where to run the broker?
  AWS
    → SQS + SNS (fully managed, no ops) for task queues and pub-sub
    → MSK (managed Kafka) for event streaming
    → ElastiCache for Redis (for BullMQ/Celery backends)
  GCP
    → Pub/Sub (fully managed, at-least-once) for task queues and pub-sub
    → Memorystore for Redis
  Self-hosted / multi-cloud
    → Redis (for BullMQ/Celery) — single binary, easy to run
    → Kafka (for streaming) — heavier, but KRaft mode removes ZooKeeper
    → RabbitMQ — single binary, good operational tools

Q4: Transactional enqueue (must not lose message even if app crashes)?
  Yes (most cases)
    → Outbox pattern: write to DB + outbox table in same transaction
      Poller (or CDC like Debezium) reads outbox, publishes to broker, marks published
      Guarantees: if DB commit succeeds, message WILL eventually be published
  No (best-effort, lossy OK)
    → Direct publish to broker in request handler
      Acceptable for: telemetry, non-critical notifications, analytics events

Q5: Consumer parallelism?
  Per-message order required
    → Single consumer, or partition by key (Kafka: same key → same partition → same consumer)
      Parallelism = number of partitions (Kafka) or 1 (everything else for strict order)
  Order not required
    → Consumer group / prefetch / concurrency
      BullMQ: `concurrency: 4` per worker process; scale by adding worker processes
      SQS: visibility timeout + multiple Lambdas/workers (scale to thousands)
      RabbitMQ: `prefetch: 4` per consumer; multiple consumers on same queue
```

## Failure Modes & Recovery

| Symptom | Cause | Recovery |
|---------|-------|----------|
| Consumer processes same message twice | At-least-once delivery redelivered after timeout but consumer was slow | Add idempotency check (dedup table on `message_id`); ensure processing < visibility timeout |
| Queue lag growing unbounded | Consumer too slow, or consumer crashed | Scale consumer concurrency; check consumer logs; verify consumer is running |
| DLQ filling up | Poison messages (always fail) or consumer bug | Inspect DLQ messages; fix consumer bug; replay DLQ after fix; investigate root cause of poison messages |
| Messages lost after broker restart | Non-durable queue, or no persistence | Enable persistence (RabbitMQ: `durable: true`; Kafka: `acks: all`, `min.insync.replicas: 2`; Redis: AOF appendfsync everysec) |
| Producer blocks for seconds | Synchronous publish waiting for consumer | Decouple: producer should only wait for broker ack, not consumer processing |
| `Failed to acquire lock` on consumer | Race condition with multiple instances + non-atomic dedup | Use atomic `SETNX` for dedup keys (Redis) or `INSERT ... ON CONFLICT DO NOTHING` (Postgres) |
| Consumer OOM on large message | Big payload (e.g. base64 image) in message body | Use claim pattern: store payload in S3, put only S3 key in message; consumer fetches from S3 |
| Kafka rebalance storm | Consumers joining/leaving rapidly | Increase `session.timeout.ms`; use cooperative sticky assignor; investigate why consumers restart |
| DLQ message can't be replayed (schema changed) | Original message payload no longer matches handler expectations | Version messages with `schema_version` field; have handler support N-1 versions |

## Self-Healing Loop

Every queue incident (DLQ spike, lag spike, duplicate processing, message loss) writes a structured record to `OMNIPROJECT_SELF_IMPROVEMENT.md`:

```
- flow: email_send_queue
  failure_class: duplicate_processing
  trigger: 3% of password reset emails sent twice over 1 hour
  recovery: idempotency check was using user_id instead of message_id — fixed to use message_id from producer
  rule_added: message-queue sub-skill now requires producer-generated message_id (not derived from payload)
```

`meta-auditor` reads these in Phase 13. If the same failure class appears ≥3 times across projects, `self-patch-generator` produces a rule that auto-adds the message_id requirement.

For DLQ specifically: if DLQ depth > 0 in production, Phase 11 alerts on-call — any DLQ message is a bug that needs investigation, never silently ignored.

## Quality Gates (enforced before declaring "queue ready")

- [ ] Consumers are idempotent (verified by test: enqueue same message twice, side effect happens once)
- [ ] Producer never blocks on consumer (verified: producer returns in < 50ms even with consumer down)
- [ ] DLQ configured and alerting on depth > 0
- [ ] Retry strategy: exponential backoff + jitter, max 10 attempts
- [ ] Ack only after processing (no auto-ack)
- [ ] Outbox pattern used for transactional enqueue (if app crashes mid-publish, no lost messages)
- [ ] Consumer lag monitoring with alert at > 1000 sustained 5 min
- [ ] Consumer concurrency appropriate (parallelism without overwhelming downstream)
- [ ] Idempotency key on every message (producer-generated UUID)
- [ ] Visibility timeout > max processing time (SQS) / ack timeout > max processing (RabbitMQ)
- [ ] Durable queues (survive broker restart)
- [ ] Tests cover: enqueue→process happy path, retry on transient failure, DLQ on permanent failure, duplicate suppression, consumer crash mid-process (message redelivered)

If any gate fails: status = `error`, do not proceed to Phase 9. Silent queue bugs cause data loss and double-processing — both are release blockers.

## Tools

- **BullMQ** (`bullmq` npm) — Node.js task queue on Redis. Best DX in Node. Delayed/repeatable jobs, flows, priorities.
- **Celery** (`celery` pip) — Python task queue. Mature, huge ecosystem. Pair with Redis or RabbitMQ as broker.
- **Kafka** (`kafkajs` npm / `kafka-python` pip) — event streaming. Use KRaft mode (no ZooKeeper). Use RedPanda for lower ops.
- **RabbitMQ** (`amqplib` npm / `pika` pip) — complex routing. Exchanges + queues + bindings.
- **AWS SQS** (`@aws-sdk/client-sqs` / `boto3`) — fully managed task queue. Standard or FIFO. Pair with SNS for fan-out.
- **Redis Streams** (`ioredis` / `redis-py`) — lightweight, durable, consumer groups. Built into Redis.
- **AWS MSK** / **Confluent Cloud** / **Aiven Kafka** — managed Kafka.
- **Debezium** — CDC (change data capture) from Postgres/MySQL to Kafka. Critical for outbox pattern without polling.
- **Dead Letter Queue libraries**: BullMQ has DLQ built in; for Kafka use Sarama's retry topic; for SQS use redrive policy.

## Permissions

- Filesystem: write to `src/queue/`, `.env.example`, migrations directory
- Network: outbound to broker (`*:9092` Kafka, `*:5672` RabbitMQ, `*:6379` Redis, `sqs.*.amazonaws.com`)
- Secrets: read broker credentials from env / IAM role only; never log message bodies with PII
- Processes: may spawn worker processes (`npm run worker`, `celery -A app worker --loglevel=info`); must reap them on shutdown
- DB: may write to `outbox` and `processed_messages` tables; may use Redis for dedup keys

## Hard Rules

1. **Always make consumers idempotent.** The delivery contract is at-least-once. Without idempotency, retries cause duplicate side effects (double charges, double emails, double DB writes). Track `message_id` in a dedup table; skip if seen.
2. **Always have a dead letter queue.** Poison messages (always fail) must not block the queue. After max retries, move to DLQ for human inspection. A queue without DLQ silently drops or blocks forever — both are bugs.
3. **Never block the producer on the consumer.** Producer enqueues and returns. Consumer processes async. If producer waits for consumer, you've built RPC, not a queue — and you've coupled user latency to consumer health.
4. **Always ack after processing, never auto-ack.** Auto-ack on receive means a consumer crash loses the message. Ack only after successful processing. For at-least-once, this is the only safe pattern.
5. **Always use exponential backoff with jitter for retries.** Linear or fixed retry causes thundering herd on recovery. Exponential (1s, 2s, 4s, ..., 600s) + ±20% jitter spreads load. Max 10 attempts; then DLQ.
6. **Always use the outbox pattern for transactional enqueue.** If the app crashes between DB commit and broker publish, the message is lost. Outbox: write to DB + outbox table in same transaction; poller/CDC publishes. Atomicity guaranteed.
7. **Never put large payloads in messages.** > 256KB (Kafka default) or > 256KB (SQS limit) breaks the broker. Use the claim pattern: store payload in S3, put only the S3 key in the message. Consumer fetches from S3.
8. **Always monitor lag and DLQ depth.** Lag = enqueued - processed. DLQ depth = bug count. Alert on lag > 1000 sustained 5 min, DLQ > 0. Silent queue backup = data loss in disguise.
9. **Always set visibility timeout > max processing time.** If processing takes 4 min and visibility timeout is 3 min, the message becomes visible again and is redelivered to another consumer — duplicate processing. Pad by 2x.
10. **Never use Redis Pub/Sub for durable work.** Redis Pub/Sub is fire-and-forget — if no subscriber, message is lost. Use Redis Streams (durable, consumer groups, replayable) for anything that must not be lost.
