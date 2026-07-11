# ADR-023: إستراتيجية الاختبارات (Testing Strategy)

## الحالة (Status)

Proposed

## السياق (Context)

المشروع ينتقل إلى Phase 1 (التنفيذ) ويحتاج إستراتيجية اختبار واضحة. توجد عدة خيارات لأطر الاختبار، ونحتاج قراراً واحداً يغطي الوحدات والتكامل والنهاية-للنهاية.

المشروع يستخدم:

- Vitest للإعدادات الحالية (`vitest.config.ts` موجود)
- Playwright للاختبارات E2E (مخطط حسب `docs/09_QA_TEST_PLAN.md`)
- CodeRabbit للمراجعة الآلية

## القرار (Decision)

### المكدس (Stack)

| المستوى                 | الأداة                          | الغرض                                       |
| ----------------------- | ------------------------------- | ------------------------------------------- |
| **وحدة (Unit)**         | Vitest                          | اختبار الوظائف الخالصة، المكونات، hooks     |
| **تكامل (Integration)** | Vitest + Supertest              | اختبار API endpoints مع قاعدة بيانات حقيقية |
| **E2E**                 | Playwright                      | اختبار تدفقات المستخدم الكاملة في المتصفح   |
| **مكونات (Component)**  | Playwright CT (Component Tests) | اختبار المكونات المعزولة مع التفاعل         |
| **بصري (Visual)**       | Playwright + `toHaveScreenshot` | اختبارات الانحدار البصري                    |
| **API**                 | Playwright API Tests            | اختبار REST endpoints بدون متصفح            |
| **أداء**                | Lighthouse CI                   | مقاييس الأداء في CI                         |

### الهيكل

```
testing/
├── unit/           # Vitest — اختبارات الوحدة
│   ├── utils/
│   ├── components/
│   └── hooks/
├── integration/    # Vitest + Supertest — API endpoints
│   ├── api/
│   └── db/
├── e2e/            # Playwright — تدفقات المستخدم
│   ├── specs/
│   ├── fixtures/
│   └── pages/      # Page Object Model
├── visual/         # Playwright — اختبارات بصرية
│   └── specs/
└── performance/    # Lighthouse CI
    └── budgets.json
```

### التسمية

- ملفات الاختبار: `*.test.ts` أو `*.spec.ts` (يُفضل `.test.ts`)
- مجلدات الاختبار: `__tests__/` داخل كل package/app
- POM files: `*.page.ts` داخل `testing/e2e/pages/`

### القواعد

1. **كل PR يجب أن يمر باختبارات:** `pnpm test` يجب أن ينجح
2. **تغطية دنيا:** ≥70% للوحدة، ≥80% للـ API
3. **لا اختبارات وهمية:** كل اختبار يُختبر فعلياً — لا `test.todo` أو `it.skip` بدون مبرر
4. **CI:** الاختبارات تُشغّل في GitHub Actions لكل PR
5. **Playwright sharding:** توزيع اختبارات E2E على 4 عمال بالتوازي

## البدائل المعتبرة

| الأداة          | المميزات               | العيوب                        | سبب الرفض                   |
| --------------- | ---------------------- | ----------------------------- | --------------------------- |
| Jest (وحدة)     | مجتمع كبير             | أبطأ من Vitest، توافق ESM أقل | Vitest أسرع ومتوافق مع Vite |
| Cypress (E2E)   | واجهة رسومية           | أبطأ، لا تدعم multi-tab       | Playwright أسرع وأكثر مرونة |
| Testing Library | يركز على سلوك المستخدم | يحتاج Vitest كـ runner        | سنستخدمه مع Vitest          |

## العواقب

- **إيجابية:** مكدس واحد لجميع مستويات الاختبار (JS/TS)، Vitest سريع ومتوافق مع Vite، Playwright يغطي E2E + API + Visual
- **سلبية:** Playwright يحتاج browsers (~400MB) في CI، vitest + supertest يحتاج DB connection للتكامل
- **مخاطر:** اختبارات E2E قد تكون بطيئة بدون sharding — الحل: sharding + إعادة تشغيل تلقائي للاختبارات الفاشلة

## المتابعة

- [ ] إعداد `playwright.config.ts` مع sharding
- [ ] إعداد Vitest مع `@testing-library/react`
- [ ] إعداد GitHub Actions workflow لاختبارات E2E
- [ ] كتابة اختبارات الوحدة للمكونات الأولى (Phase 1)
- [ ] إعداد تقرير التغطية (Istanbul)
