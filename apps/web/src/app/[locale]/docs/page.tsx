import type { Metadata } from "next";
import { Container } from "@/ui/container";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Badge } from "@/ui/badge";
import { openApiSpec } from "@/shared/openapi";

interface DocsPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: DocsPageProps): Promise<Metadata> {
  await params;
  return {
    title: "توثيق واجهة برمجة التطبيقات",
    description: "توثيق REST API لمنصة ابن الأزهر",
  };
}

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  POST: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  PUT: "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  PATCH: "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  DELETE: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const TAG_ORDER: Record<string, number> = {
  Auth: 0,
  Health: 1,
  Upload: 2,
  Conversion: 3,
  Documents: 4,
  Export: 4,
  Folders: 5,
  Tags: 6,
  Search: 7,
  Share: 8,
  Profile: 9,
  Users: 10,
  Metrics: 11,
  Stream: 12,
};

export default async function DocsPage({ params }: DocsPageProps) {
  await params;

  const endpoints: {
    method: string;
    path: string;
    summary: string;
    tag: string;
    auth: boolean;
  }[] = [];

  const spec = openApiSpec as Record<string, unknown>;
  const paths = (spec.paths ?? {}) as Record<string, Record<string, Record<string, unknown>>>;
  for (const [path, methods] of Object.entries(paths)) {
    const methodObj = methods;
    for (const [method, op] of Object.entries(methodObj)) {
      if (method === "parameters") continue;
      const operation = op as Record<string, unknown>;
      endpoints.push({
        method: method.toUpperCase(),
        path: path.replace("/api", ""),
        summary: (operation.summary as string) ?? path,
        tag: ((operation.tags as string[])?.[0] ?? "General"),
        auth: ((operation.security as unknown[])?.length ?? 0) > 0,
      });
    }
  }

  endpoints.sort((a, b) => {
    const ta = TAG_ORDER[a.tag] ?? 99;
    const tb = TAG_ORDER[b.tag] ?? 99;
    if (ta !== tb) return ta - tb;
    return a.path.localeCompare(b.path);
  });

  const byTag = endpoints.reduce<Record<string, typeof endpoints>>((acc, e) => {
    (acc[e.tag] = acc[e.tag] || []).push(e);
    return acc;
  }, {});
  const tags = Object.keys(byTag).sort(
    (a, b) => (TAG_ORDER[a] ?? 99) - (TAG_ORDER[b] ?? 99)
  );

  return (
    <div className="min-h-screen bg-page">
      <Container className="py-8 sm:py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary-color">
            توثيق واجهة برمجة التطبيقات
          </h1>
          <p className="mt-2 text-secondary-color max-w-2xl">
            واجهات برمجة التطبيقات (REST API) لمنصة ابن الأزهر لمعالجة الوثائق —
            الرفع، التحويل، التصدير، والمشاركة.
          </p>
          <a
            href="/api/docs/openapi"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-4 px-4 py-2 text-sm font-medium border border-line rounded-lg hover:bg-badge transition-colors"
          >
            تحميل مواصفات OpenAPI (JSON)
          </a>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tags.map((tag) => {
            const items = byTag[tag];
            return (
              <Card key={tag} className="overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Badge variant="secondary">{items.length}</Badge>
                    {tag}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 max-h-[400px] overflow-y-auto">
                    {items.map((e) => (
                      <li key={`${e.method}-${e.path}`} className="pb-2 border-b border-line last:border-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${METHOD_COLORS[e.method] ?? "bg-line text-muted-color"}`}
                          >
                            {e.method}
                          </span>
                          <code className="text-xs text-muted-color break-all">
                            {e.path}
                          </code>
                        </div>
                        <p className="text-[11px] text-secondary-color leading-tight">
                          {e.summary}
                        </p>
                        {e.auth && (
                          <span className="text-[10px] text-success font-medium mt-1 block">
                            يتطلب تسجيل دخول
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </Container>
    </div>
  );
}
