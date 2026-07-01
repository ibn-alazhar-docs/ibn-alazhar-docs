# Domain Patterns — Desktop, Embedded, ML, Serverless, Data Engineering, Real-Time, Game

## Desktop Applications

### Electron (JS/TS)

Main process (Node) + Renderer (Chromium). IPC via ipcMain/ipcRenderer.
Audit: nodeIntegration: false, contextIsolation: true, auto-update with signature, code signing.

### Tauri (Rust + Web)

Smaller bundle (~3MB). Rust backend, web frontend. Capability-based security.

### Qt (C++) / WPF (.NET)

Qt: MVC, signals/slots, RAII. WPF: MVVM, XAML, INotifyPropertyChanged, async/await.

### Desktop audit

Installation/uninstallation cleanliness, auto-update reliability, cross-platform consistency, startup time, memory, battery, crash reporting.

## Embedded & IoT

### Bare Metal: No OS, real-time, fixed memory. Watchdog, no dynamic alloc in hot paths.

### RTOS (FreeRTOS, Zephyr): Tasks with priorities. Watch priority inversion, stack sizes.

### IoT: MQTT (QoS 1, LWT, TLS), OTA (Mender, RAUC), device management, edge computing.

### Embedded audit: memory <80%, power, boot time, flash wear, WCET, safety (MISRA), secure boot.

## ML/AI Pipelines

### Training: Data ingestion → Preprocessing → Feature engineering → Training → Validation → Model registry

Audit: data versioning (DVC), feature store (Feast), experiment tracking (MLflow), reproducibility, bias, privacy.

### Serving: model versioning, inference latency SLO, drift detection, quality monitoring, fallback.

### ML audit: reproducibility, data quality, bias/fairness, explainability (SHAP), privacy, security, cost.

## Data Engineering

### Batch (Airflow, dbt, Spark): idempotent jobs, backfill, data quality checks, SLA tracking.

### Stream (Kafka, Flink): exactly-once, watermarking, state management, backpressure.

### Lakehouse (Delta, Iceberg, Hudi): ACID, schema evolution, partitioning, compaction.

### Data audit: quality, pipeline reliability, performance, cost, lineage, governance, schema evolution.

## Real-Time Systems

### WebSocket: connection management (heartbeat, reconnect), auth, rate limiting, backpressure, scaling (pub/sub backbone).

### WebRTC: signaling auth, TURN capacity, codec negotiation, bandwidth adaptation, E2E encryption.

### Patterns: pub/sub backbone, connection sharding, presence service, message ordering, CRDTs (Yjs, Automerge).

## Serverless / FaaS

### AWS Lambda: cold start mitigation (provisioned concurrency), timeout, memory, idempotency, DLQ, IAM least privilege.

### Cloudflare Workers: V8 isolates, sub-ms cold start, edge. Workers KV, D1, R2.

### Serverless audit: cold start (p99), cost, vendor lock-in, observability (X-Ray), security.

## Game Development

### Unity (C#): component design, object pooling, Update/FixedUpdate/LateUpdate, Addressables.

### Unreal (C++/Blueprints): C++ for hot paths, UPROPERTY/UFUNCTION, GC awareness, replication.

### Game audit: 60 FPS, frame time consistency, memory (cert), load times, save integrity, anti-cheat, accessibility.

## Domain Detection

```
Electron/Tauri/Qt/WPF → Desktop
FreeRTOS/Zephyr/Arduino → Embedded
PyTorch/TF/MLflow → ML
Airflow/dbt/Spark → Data Eng
WebSocket/WebRTC → Real-Time
Lambda/Workers → Serverless
Unity/Unreal → Game
```
