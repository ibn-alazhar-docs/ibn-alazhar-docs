import { getTranslations } from "next-intl/server";
import { prisma } from "@/transport/db";
import { loadConfig, downloadFile, fileExists } from "@ibn-al-azhar-docs/pipeline";

interface SharePageProps {
  params: Promise<{ locale: string; token: string }>;
}

async function getShareData(token: string) {
  const share = await prisma.shareLink.findUnique({
    where: { token },
    include: {
      document: {
        select: {
          id: true,
          title: true,
          description: true,
          language: true,
          isRtl: true,
          pageCount: true,
          outputFormats: true,
          createdAt: true,
          status: true,
          deletedAt: true,
        },
      },
    },
  });

  if (!share) return { error: "notFound" as const };
  if (share.document.deletedAt) return { error: "deleted" as const };
  if (share.document.status !== "COMPLETED") return { error: "notFound" as const };
  if (share.expiresAt && new Date() > share.expiresAt) return { error: "expired" as const };

  const tags = await prisma.tagDocument.findMany({
    where: { documentId: share.documentId },
    include: { tag: { select: { name: true, color: true } } },
  });

  let markdown = "";
  let rawText = "";

  const config = loadConfig();

  const ocrKey = `${config.paths.ocrResults}/${share.documentId}/text.json`;
  const ocrExists = await fileExists(config, ocrKey);
  if (ocrExists) {
    const ocrBuffer = await downloadFile(config, ocrKey);
    try {
      const ocrData = JSON.parse(ocrBuffer.toString("utf-8"));
      rawText = ocrData.text || "";
    } catch {
      rawText = "";
    }
  }

  const mdKey = `${config.paths.exports}/${share.documentId}/output.md`;
  const mdExists = await fileExists(config, mdKey);
  if (mdExists) {
    const buffer = await downloadFile(config, mdKey);
    markdown = buffer.toString("utf-8");
    if (!rawText) rawText = markdown;
  }

  const folder = await prisma.folder.findFirst({
    where: { documents: { some: { id: share.documentId } } },
    select: { name: true },
  });

  return {
    document: {
      id: share.document.id,
      title: share.document.title,
      description: share.document.description,
      language: share.document.language,
      isRtl: share.document.isRtl,
      pageCount: share.document.pageCount,
      createdAt: share.document.createdAt.toISOString(),
    },
    content: {
      markdown,
      rawText,
    },
    metadata: {
      tags: tags.map((td) => ({
        name: td.tag.name,
        color: td.tag.color,
      })),
      folder: folder?.name ?? null,
      exportFormats: share.document.outputFormats,
    },
  };
}

function renderMarkdown(markdown: string): string {
  const cleaned = markdown.replace(/^---\n[\s\S]*?\n---\n/g, "");
  const lines = cleaned.split("\n");
  const escapeHtml = (str: string): string =>
    str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  let html = "";
  let inList: "ul" | "ol" | null = null;
  let inParagraph = false;

  const closeParagraph = () => {
    if (inParagraph) {
      html += "</p>\n";
      inParagraph = false;
    }
  };

  const closeList = () => {
    if (inList) {
      html += `</${inList}>\n`;
      inList = null;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "") {
      closeParagraph();
      continue;
    }

    if (trimmed === "---") {
      closeParagraph();
      closeList();
      html += '<hr class="my-6 border-line" />\n';
      continue;
    }

    if (trimmed.startsWith("# ")) {
      closeParagraph();
      closeList();
      html += `<h1 class="text-2xl font-bold mt-6 mb-3">${escapeHtml(trimmed.slice(2))}</h1>\n`;
      continue;
    }
    if (trimmed.startsWith("## ")) {
      closeParagraph();
      closeList();
      html += `<h2 class="text-xl font-semibold mt-5 mb-2">${escapeHtml(trimmed.slice(3))}</h2>\n`;
      continue;
    }
    if (trimmed.startsWith("### ")) {
      closeParagraph();
      closeList();
      html += `<h3 class="text-lg font-medium mt-4 mb-2">${escapeHtml(trimmed.slice(4))}</h3>\n`;
      continue;
    }

    if (trimmed.startsWith("- ")) {
      closeParagraph();
      if (inList !== "ul") {
        closeList();
        html += '<ul class="my-4 ps-6 list-disc">\n';
        inList = "ul";
      }
      html += `  <li class="mb-1 leading-relaxed">${escapeHtml(trimmed.slice(2))}</li>\n`;
      continue;
    }

    const olMatch = trimmed.match(/^\d+[.)]\s+(.*)$/);
    if (olMatch) {
      closeParagraph();
      if (inList !== "ol") {
        closeList();
        html += '<ol class="my-4 ps-6 list-decimal">\n';
        inList = "ol";
      }
      html += `  <li class="mb-1 leading-relaxed">${escapeHtml(olMatch[1] ?? "")}</li>\n`;
      continue;
    }

    closeList();
    if (!inParagraph) {
      html += '<p class="mb-4 leading-relaxed">';
      inParagraph = true;
    } else {
      html += " ";
    }
    html += escapeHtml(trimmed);
  }

  closeParagraph();
  closeList();
  return html;
}

export async function generateMetadata({ params }: SharePageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "share" });
  return {
    title: t("preview"),
  };
}

export default async function SharePage({ params }: SharePageProps) {
  const { locale, token } = await params;
  const t = await getTranslations({ locale, namespace: "share" });

  const result = await getShareData(token);

  if ("error" in result) {
    if (result.error === "expired") {
      return (
        <div className="min-h-screen flex items-center justify-center bg-page">
          <div className="text-center max-w-md mx-auto p-8">
            <div className="mb-4 text-muted-color">
              <svg
                className="w-16 h-16 mx-auto"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-primary-color mb-2">{t("expired")}</h1>
            <p className="text-muted-color text-sm">{t("requestNewLinkFromOwner")}</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-page">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="mb-4 text-muted-color">
            <svg
              className="w-16 h-16 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-primary-color mb-2">{t(result.error as string)}</h1>
          <p className="text-muted-color text-sm">{t("requestNewLinkFromOwner")}</p>
        </div>
      </div>
    );
  }

  const data = result;
  const dir = data.document.isRtl ? "rtl" : "ltr";

  return (
    <div className="min-h-screen bg-page" dir={dir}>
      <header className="border-b border-line bg-surface">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-primary-color">{data.document.title}</h1>
          <div className="flex gap-2">
            {data.metadata.exportFormats.includes("md") && (
              <a
                href={`/api/share/${token}/export/md`}
                className="px-3 py-1.5 text-sm bg-page text-primary-color border border-line rounded-lg hover:bg-hover"
              >
                {t("download")} .md
              </a>
            )}
            {data.metadata.exportFormats.includes("txt") && (
              <a
                href={`/api/share/${token}/export/txt`}
                className="px-3 py-1.5 text-sm bg-page text-primary-color border border-line rounded-lg hover:bg-hover"
              >
                {t("download")} .txt
              </a>
            )}
            {data.metadata.exportFormats.includes("json") && (
              <a
                href={`/api/share/${token}/export/json`}
                className="px-3 py-1.5 text-sm bg-page text-primary-color border border-line rounded-lg hover:bg-hover"
              >
                {t("download")} .json
              </a>
            )}
          </div>
        </div>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="max-w-4xl mx-auto px-4 py-8 focus:outline-none"
      >
        <article className="prose prose-lg max-w-none">
          <h1>{data.document.title}</h1>

          {data.document.description && (
            <p className="text-muted-color">{data.document.description}</p>
          )}

          <div className="flex flex-wrap gap-2 my-4">
            {data.metadata.tags.map((tag) => (
              <span
                key={tag.name}
                className="px-2 py-1 text-xs rounded-full text-white"
                style={{ backgroundColor: tag.color }}
              >
                {tag.name}
              </span>
            ))}
            {data.metadata.folder && (
              <span className="px-2 py-1 text-xs rounded-full bg-badge text-muted-color">
                {data.metadata.folder}
              </span>
            )}
            {data.document.pageCount && (
              <span className="px-2 py-1 text-xs rounded-full bg-badge text-muted-color">
                {data.document.pageCount} {t("pages")}
              </span>
            )}
          </div>

          <hr className="my-6 border-line" />

          <div
            className="text-primary-color leading-relaxed"
            dangerouslySetInnerHTML={{
              __html: renderMarkdown(data.content.markdown),
            }}
          />
        </article>
      </main>

      <footer className="border-t border-line py-4 text-center text-muted-color text-sm">
        Ibn Al-Azhar Docs
      </footer>
    </div>
  );
}
