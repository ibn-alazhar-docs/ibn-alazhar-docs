# Ibn Al-Azhar Docs — Architecture Diagram

> Updated: 2025-06-14

## Page Structure (App Router)

```mermaid
graph TD
    Root["/ (Next.js 16 App Router)"]
    Root --> LocaleLayout["/[locale] (ar/en)"]

    LocaleLayout --> AuthGroup["(auth)"]
    LocaleLayout --> DashboardGroup["(dashboard)"]
    LocaleLayout --> PublicGroup["(public)"]
    LocaleLayout --> DocsGroup["/docs (MDX)"]

    AuthGroup --> Login["/login"]
    AuthGroup --> Register["/register"]

    DashboardGroup --> Dashboard["/dashboard"]
    DashboardGroup --> Files["/files"]
    DashboardGroup --> Folders["/folders"]
    DashboardGroup --> Tags["/tags"]
    DashboardGroup --> Search["/search"]
    DashboardGroup --> Conversions["/conversions"]
    DashboardGroup --> Preview["/preview"]
    DashboardGroup --> Settings["/settings"]
    DashboardGroup --> Users["/users (admin only)"]

    PublicGroup --> Share["/share/[token]"]

    style AuthGroup fill:#f9f,stroke:#333,stroke-width:1px
    style DashboardGroup fill:#9cf,stroke:#333,stroke-width:1px
    style PublicGroup fill:#9f9,stroke:#333,stroke-width:1px
```

## Auth Flow

```mermaid
sequenceDiagram
    participant U as User/Browser
    participant M as Middleware (NextAuth)
    participant A as API Route
    participant AG as Auth Guards (lib/auth-guards)
    participant D as Database (Prisma)

    U->>M: Request /ar/files
    M->>M: Check next-auth.session-token cookie

    alt No Session Cookie
        M->>U: Redirect to /ar/login
        U->>A: POST /api/auth/register or credentials
        A->>AG: requireAuth() / authorize()
        AG->>D: Find/Verify user
        D-->>AG: User record
        AG-->>A: Session JWT
        A-->>U: Set session cookie, respond
    else Valid Session
        M->>M: Extract locale from URL
        M->>M: Set x-locale header
        M->>M: Apply rate limiting on /api/*
        M->>U: Forward to page with headers
    end

    U->>A: API call (e.g. GET /api/documents)
    A->>AG: requireAuth()
    AG->>M: Re-verify session
    M-->>AG: Session user
    AG-->>A: { user: { id, role, ... } }
    A->>A: Apply ownedWhere() for multi-tenant
    A->>D: Prisma query
    D-->>A: Results
    A-->>U: JSON response
```

## Data Flow — Document Upload & Processing

```mermaid
flowchart LR
    subgraph Client
        Browser["Browser / PWA"]
    end

    subgraph NextJS["Next.js 16 App"]
        MW["Middleware<br/>(Auth + i18n + Rate Limit)"]
        API["API Routes<br/>(14 modules)"]
        RSC["React Server Components<br/>(Pages + Layouts)"]
        CC["Client Components<br/>(UI + Interactivity)"]
    end

    subgraph Backing["Backing Services"]
        PG[("PostgreSQL 16<br/>(Prisma ORM)")]
        RD[("Redis 7<br/>(BullMQ + Cache)")]
        MI[("MinIO<br/>(S3-compatible)")]
    end

    subgraph Workers["Background Workers"]
        OCR["ocr-worker<br/>(Surya OCR)"]
        EXP["export-worker<br/>(Format conversion)"]
    end

    Browser -->|HTTP/HTTPS| MW
    MW -->|Route + Auth| RSC
    MW -->|/api/*| API
    RSC -->|Server Data| CC
    CC -->|User Actions| API

    API -->|Read/Write| PG
    API -->|Upload/Download| MI
    API -->|Queue Jobs| RD

    RD -->|Dequeue Tasks| OCR
    RD -->|Dequeue Tasks| EXP
    OCR -->|OCR Result| MI
    EXP -->|Exported Files| MI
    OCR -->|Status Update| PG
    EXP -->|Status Update| PG

    style Client fill:#e1f5fe,stroke:#0288d1
    style NextJS fill:#f3e5f5,stroke:#7b1fa2
    style Backing fill:#fff3e0,stroke:#f57c00
    style Workers fill:#e8f5e9,stroke:#388e3c
```

## Component Hierarchy

```mermaid
graph TD
    MainLayout["Root Layout<br/>src/app/layout.tsx"]
    MainLayout --> ProviderTree["Provider Tree"]
    ProviderTree --> ThemeWrapper["ThemeWrapper"]
    ThemeWrapper --> IntlProvider["NextIntlClientProvider"]
    IntlProvider --> LocaleLayout["[locale]/layout.tsx<br/>Fonts + JSON-LD"]

    LocaleLayout --> AuthLayout["(auth)/layout.tsx<br/>Guest-only"]
    AuthLayout --> LoginPage["Login Page"]
    AuthLayout --> RegisterPage["Register Page"]

    LocaleLayout --> DashLayout["(dashboard)/layout.tsx<br/>requireAuth()"]
    DashLayout --> DashShell["DashboardShell (Client)"]
    DashShell --> Header["Header<br/>Menu Toggle, Role"]
    DashShell --> Sidebar["Sidebar<br/>Nav Items, Admin Badge"]
    DashShell --> MainContent["<main> Children"]

    DashLayout --> FilesPage["/files<br/>file list + upload"]
    DashLayout --> FoldersPage["/folders<br/>folder tree"]
    DashLayout --> TagsPage["/tags<br/>tag management"]
    DashLayout --> SearchPage["/search<br/>search + results"]
    DashLayout --> ConversionsPage["/conversions<br/>job status"]
    DashLayout --> PreviewPage["/preview/[id]"]
    DashLayout --> SettingsPage["/settings"]
    DashLayout --> UsersPage["/users (Admin only)"]

    LocaleLayout --> PublicLayout["(public)/layout.tsx"]
    PublicLayout --> SharePage["/share/[token]<br/>Public document view"]

    LocaleLayout --> DocsLayout["/docs/layout.tsx"]
    DocsLayout --> MDXPage["MDX Documentation Pages"]

    style MainLayout fill:#e8eaf6,stroke:#3f51b5,stroke-width:2px
    style DashLayout fill:#e0f2f1,stroke:#00796b,stroke-width:2px
    style DashShell fill:#fff9c4,stroke:#fbc02d
    style AuthLayout fill:#fce4ec,stroke:#c2185b
    style PublicLayout fill:#f0f4c3,stroke:#827717
```

## API Route Map

```mermaid
graph LR
    API["/api"] --> Auth["/auth<br/>[...nextauth] + register"]
    API --> Docs["/documents<br/>CRUD + bulk"]
    API --> Upload["/upload<br/>POST (file upload)"]
    API --> Folders["/folders<br/>CRUD"]
    API --> Tags["/tags<br/>CRUD + merge"]
    API --> Search["/search<br/>GET + /suggest"]
    API --> Conversion["/conversion<br/>start + list + status"]
    API --> Export["/export<br/>batch + download + folder"]
    API --> Share["/share<br/>/[token]"]
    API --> Profile["/profile<br/>user settings"]
    API --> Stream["/stream<br/>SSE events"]
    API --> Health["/health<br/>system status"]
    API --> Metrics["/metrics<br/>system metrics"]

    style API fill:#e1d5e7,stroke:#7b1fa2,stroke-width:2px
    style Auth fill:#f9f,stroke:#333
    style Upload fill:#9cf,stroke:#333
    style Search fill:#9cf,stroke:#333
```

## Infrastructure & Deployment

```mermaid
graph TD
    Internet["Internet"] --> Caddy["Caddy 2<br/>(Reverse Proxy, TLS)"]
    Caddy --> NextApp["Next.js 16<br/>(Standalone Output)"]

    NextApp --> PG[("PostgreSQL 16")]
    NextApp --> RD[("Redis 7")]
    NextApp --> MI[("MinIO S3")]

    RD --> OCRW["ocr-worker"]
    RD --> EXPW["export-worker"]

    OCRW --> MI
    EXPW --> MI
    OCRW --> PG
    EXPW --> PG

    subgraph Docker["Docker Compose"]
        Caddy
        NextApp
        PG
        RD
        MI
        OCRW
        EXPW
    end

    style Docker fill:#e3f2fd,stroke:#1565c0
    style Internet fill:#fce4ec,stroke:#c62828
```

## Key Design Decisions

| القرار               | الخيار            | السبب                                 |
| -------------------- | ----------------- | ------------------------------------- |
| Authentication       | NextAuth v5 (JWT) | بدون جلسات — مناسب لـ API-first       |
| Database ORM         | Prisma 6          | Type-safety + migrations              |
| Queue                | BullMQ + Redis    | معالجة خلفية موثوقة                   |
| OCR                  | Surya (محلي)      | خصوصية تامة — لا APIs خارجية          |
| Storage              | MinIO (S3)        | متوافق مع S3 — يسهل التبديل للـ Cloud |
| Internationalization | next-intl         | RTL-first + SSR                       |
| Monorepo             | pnpm workspaces   | بدون Turborepo — بساطة                |
