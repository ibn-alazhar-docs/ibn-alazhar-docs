# 📚 دليل الذكاء الاصطناعي للمشروع — Ibn Al-Azhar Docs

> **Project Context**: نظام معالجة وثائق عربي أولاً، مُوجّه لطلاب الأزهر الشريف، مبني على Next.js 14+، TypeScript، وDocker.

---

## 🎯 متى تستخدم هذا الملف؟
استخدم هذا الملف كمرجع أولي فقط. عند الحاجة إلى فهم هيكل الكود، أو مواقع المنطق الرئيسي، أو أنماط التصميم المستخدمة في المشروع، **ارجع مباشرةً إلى `docs/wiki/`** — فهو المصدر الوحيد الموثوق والمحدَّث تلقائيًا.

## 🌐 أين تجد السياق الكامل؟
- جميع وثائق السياق التقني مُولَّدة وتُحدَّث تلقائيًا عبر [OpenWiki](https://github.com/langchain-ai/openwiki)
- المسار: [`docs/wiki/`](./docs/wiki/)
- يتضمَّن: خرائط الملفات، شرح وظائف الاستخدام (use-cases)، تدفقات البيانات، وتوثيق الخدمات الأساسية (مثل `analytics`, `share`, `upload`).

## ⚠️ قواعد الاستخدام المهمة
- ❌ لا تحرِّر ملفات داخل `docs/wiki/` يدويًّا — أي تعديل يدوي سيُمحى عند التشغيل التالي لـ `openwiki --update`.
- ✅ استخدم الأمر `npm run docs:wiki:update` لتحديث الوثائق بعد أي مجموعة كبيرة من التغييرات.
- 🧩 عند تنفيذ مهمة جديدة: ابدأ دائمًا بقراءة الصفحة ذات الصلة في `docs/wiki/` قبل كتابة أي كود.

## 🛠 كيف تُحدَّث الوثائق؟
تم تكوين OpenWiki ليُحدث `docs/wiki/` تلقائيًا عند:
- تشغيل `npm run docs:wiki:update` (يدوي)
- تشغيل GitHub Action يوميًا (إذا تم تفعيله)

---

## 🇬🇧 English Summary
This is the AI agent’s entry point into the codebase. For deep context — file responsibilities, architecture decisions, data flows — always refer to `docs/wiki/`. It is auto-generated, versioned, and kept in sync with the code.

Maintained by: OpenWiki CLI (`openwiki --init`, `openwiki --update`)

---

## Design System
Always read `DESIGN.md` before making any visual or UI decisions.
All font choices, colors, spacing, and aesthetic direction are defined there.
Do not deviate without explicit user approval.
In QA mode, flag any code that doesn't match `DESIGN.md`.