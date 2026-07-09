export interface JourneyDefinition {
  slug: string;
  title: Record<string, string>;
  description: Record<string, string>;
  icon: string;
  docSlugs: string[];
}

export const JOURNEY_DEFINITIONS: JourneyDefinition[] = [
  {
    slug: "beginner-path",
    title: { ar: "طريق المبتدئ", en: "Beginner's Path" },
    description: {
      ar: "مسيرة قراءة منظمة للقادم الجديد إلى المنصة، تبدأ من التعريف العام وصولًا إلى فهم نظام التصنيف.",
      en: "An organized reading journey for newcomers, starting with the general overview and progressing to understanding the classification system.",
    },
    icon: "01",
    docSlugs: [
      "doc-001-platform-overview",
      "doc-002-methodology-principles",
      "doc-003-knowledge-taxonomies",
    ],
  },
  {
    slug: "methodology-path",
    title: { ar: "منهجية التوثيق", en: "Documentation Methodology" },
    description: {
      ar: "رحلة متعمقة في منهجية التوثيق العلمي، من المبادئ الأساسية إلى معايير الجودة والتحقيق.",
      en: "An in-depth journey into scholarly documentation methodology, from core principles to quality standards and verification.",
    },
    icon: "02",
    docSlugs: ["doc-002-methodology-principles", "doc-001-platform-overview"],
  },
  {
    slug: "knowledge-organization",
    title: { ar: "تنظيم المعرفة", en: "Knowledge Organization" },
    description: {
      ar: "استكشاف نظام تصنيف المعرفة في المنصة، من التقسيم الهرمي إلى معايير التصنيف.",
      en: "Exploring the knowledge classification system, from hierarchical division to classification standards.",
    },
    icon: "03",
    docSlugs: ["doc-003-knowledge-taxonomies", "doc-002-methodology-principles"],
  },
  {
    slug: "quest-foundational",
    title: { ar: "المسار التأسيسي", en: "Foundational Path" },
    description: {
      ar: "مدخل إلى فقه طلب العلم: فضل العلم، فقه الأولويات، والتمييز بين علوم المقاصد وعلوم الآلة.",
      en: "An introduction to the fiqh of seeking knowledge: the virtue of knowledge, priority fiqh, and distinguishing purposive from instrumental sciences.",
    },
    icon: "04",
    docSlugs: ["quest-001-fadl-alilm", "quest-002-priority-fiqh", "quest-003-alat-waqasd"],
  },
  {
    slug: "quest-methodology",
    title: { ar: "منهجية الطلب", en: "Learning Methodology" },
    description: {
      ar: "منهج التدرج وآداب الطلب: كيف يبني طالب العلم مسيرته التعليمية خطوة بخطوة.",
      en: "The method of gradual progression and the etiquette of learning: how a student builds their educational journey step by step.",
    },
    icon: "05",
    docSlugs: ["quest-002-priority-fiqh", "quest-004-tadarruj", "quest-005-adab-alilm"],
  },
  {
    slug: "quest-specialization",
    title: { ar: "التخصص والتركيب", en: "Specialization & Synthesis" },
    description: {
      ar: "من التوازن بين التخصص والشمول إلى التأليف والتصنيف ونموذج عملي لطلب العلم.",
      en: "From balancing specialization and breadth to authorship, classification, and a practical model for seeking knowledge.",
    },
    icon: "06",
    docSlugs: [
      "quest-003-alat-waqasd",
      "quest-006-tawazun",
      "quest-007-talif",
      "quest-008-namudhaj",
    ],
  },
  {
    slug: "quest-complete",
    title: { ar: "الرحلة الكاملة", en: "Complete Journey" },
    description: {
      ar: "الرحلة المتكاملة في فقه طلب العلم: من البدايات إلى التأليف والنماذج العملية.",
      en: "The complete journey in the fiqh of seeking knowledge: from beginnings to authorship and practical models.",
    },
    icon: "07",
    docSlugs: [
      "quest-001-fadl-alilm",
      "quest-002-priority-fiqh",
      "quest-003-alat-waqasd",
      "quest-004-tadarruj",
      "quest-005-adab-alilm",
      "quest-006-tawazun",
      "quest-007-talif",
      "quest-008-namudhaj",
    ],
  },
];
