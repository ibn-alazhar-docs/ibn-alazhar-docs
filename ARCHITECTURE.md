# 📐 الهيكل المعماري والقرارات الهندسية — ARCHITECTURE.md

يوضح هذا الملف البنية الهندسية الكلية لمشروع **Ibn Al-Azhar Docs** والقرارات المعمارية الرئيسية (Design Decisions) التي تحكم عمل التطبيق، لضمان استمرارية التطبيق وفهمه من قِبل أي مطور أو وكيل ذكاء اصطناعي جديد.

---

## 🗺️ 1. مخطط البنية الهندسية الكلية (System Architecture)

```mermaid
graph TB
    subgraph "Frontend - Next.js 16 App Router"
        UI["Web UI<br/>(React Server Components)"]
        API["/api/* Routes<br/>(Thin handlers)"]
    end

    subgraph "Business Logic"
        CR["Composition Root<br/>(Central DI)"]
        UC["Use Cases<br/>(Services)"]
        REPO["Repositories<br/>(Interfaces)"]
    end

    subgraph "Infrastructure"
        DB[("PostgreSQL 16<br/>(via PgBouncer)")]
        REDIS[("Redis 7<br/>(BullMQ + Rate Limiting)")]
        MINIO[("MinIO<br/>(S3-compatible)")]
    end

    subgraph "Background Workers"
        OCR["OCR Worker<br/>(PDF/Image → Markdown)"]
        EXPORT["Export Worker<br/>(Documents → ZIP/PDF/DOCX)"]
    end

    subgraph "External"
        GOOGLE["Google Drive API"]
        HF["HuggingFace Spaces"]
    end

    UI --> API
    API --> CR
    CR --> UC
    UC --> REPO
    REPO --> DB
    REPO --> MINIO
    UC --> REDIS
    REDIS --> OCR
    REDIS --> EXPORT
    OCR --> MINIO
    EXPORT --> MINIO
    EXPORT --> GOOGLE
    HF --> UI
```

---

## 🔄 2. تدفق البيانات لمعالجة الوثائق (Data Flow)

```mermaid
sequenceDiagram
    participant U as User
    participant W as Web UI
    participant A as API
    participant D as Database
    participant S as MinIO
    participant R as Redis
    participant O as OCR Worker

    U->>W: Upload PDF/Image
    W->>A: POST /api/upload
    A->>D: Create document record
    A->>S: Upload binary file
    A->>R: Enqueue OCR job
    A-->>W: SSE: Job queued
    R->>O: Dequeue job
    O->>S: Stream binary
    O->>O: Execute OCR (Surya/Tesseract)
    O->>D: Update document state
    O->>S: Persist Markdown
    O->>R: Publish progress
    R-->>W: SSE: State update
    W-->>U: Preview Markdown
```

---

## 🧠 3. القرارات المعمارية الرئيسية (Core Architectural Decisions)

تم توثيق القرارات التالية بناءً على كود المشروع الفعلي والمنطق المتبع:

### أ. تحديد معدل الطلبات (Redis-First Rate Limiting)
* **القرار:** يُعتمد على Redis كمصدر وحيد وموثق لتحديد معدل الطلبات الموزعة عبر خوادم متعددة (Distributed Rate Limiting).
* **التفاصيل الاحتياطية:** في حال تعطل Redis أو عدم توفره مؤقتاً، يقوم النظام تلقائياً بالتحول إلى نظام تحديد المعدل المحلي داخل ذاكرة كل خادم (In-memory fallback) لضمان استمرارية عمل التطبيق وتفادي قفل الخدمة تماماً.
* **سياسة الاستثناء:** حماية العمليات التدميرية (مثل الحذف أو التعديل الجماعي) تكون أكثر صرامة من تحديد المعدل المبني على الـ IP، حيث يتم التحقق بناءً على هوية المستخدم الفردية لأن المستخدم الواحد قد يمتلك عدة عناوين IP (مثل العمل من الهاتف والحاسوب في نفس الوقت).

### ب. إدارة طوابير الخلفية (BullMQ Internals)
* **القرار:** يتم تمرير قيمة `null` للمحاولات عند مستوى الأوامر المنفردة، وترك إدارة تكرار المحاولات الفاشلة واستراتيجيات إعادة المحاولة لتقع بالكامل تحت تصرف طوابير BullMQ الداخلية.
* **السبب:** لمنع حدوث تعارض وتكرار العمليات بين خادم الويب وعمال معالجة الخلفية.

### ج. إعداد اتصالات العمال (Worker Connection Lock)
* **القرار:** استخدام قفل اتصال مشترك (`connectionLock`) لمنع حدوث حالات سباق البيانات (Race Conditions) عندما يقوم عمال متعددون باستدعاء دالة `getConnection` في نفس اللحظة للربط بقاعدة البيانات أو Redis.

---

## ⚠️ 4. تنبيهات حول المخاطر والاعتمادية (Critical Risk Warnings)

> [!CAUTION]
> **خطر تركيز المعرفة (Bus Factor = 1.0):**
> تشير إحصاءات Repowise إلى أن المطور **Abed** هو المالك والمسؤول الوحيد بنسبة **100%** عن كامل الكود وتعديلاته في آخر 90 يوماً. لتقليل هذا الخطر:
> 1. يجب على أي مطور أو وكيل ذكاء اصطناعي قراءة هذا الملف وملف `.agents/AGENTS.md` قبل البدء.
> 2. يجب توثيق أي ميزة جديدة أو تغيير جوهري في هذا المستند فوراً.
> 3. يوصى بإشراك مطورين آخرين في مراجعة الأكواد البرمجية (Code Review).
