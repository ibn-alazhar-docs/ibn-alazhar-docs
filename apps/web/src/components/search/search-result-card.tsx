import * as React from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Text } from "@/components/ui/text";

export interface SearchResult {
  id: string;
  title: string;
  description?: string | null;
  originalName: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  status: string;
  searchPreview?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SearchResultCardProps {
  result: SearchResult;
  getStatusLabel: (status: string) => string;
}

export function SearchResultCard({ result, getStatusLabel }: SearchResultCardProps) {
  const locale = useLocale();
  const tCommon = useTranslations("common");

  // Determine badge color variant based on status
  const getBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "success" | "warning" => {
    switch (status.toUpperCase()) {
      case "COMPLETED":
        return "success";
      case "FAILED":
        return "destructive";
      case "PENDING":
      case "PROCESSING":
      case "OCR_PROCESSING":
        return "warning";
      default:
        return "secondary";
    }
  };

  const formattedSize = React.useMemo(() => {
    const size = result.fileSize;
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }, [result.fileSize]);

  const formattedDate = React.useMemo(() => {
    try {
      const date = new Date(result.createdAt);
      return date.toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return result.createdAt;
    }
  }, [result.createdAt, locale]);

  return (
    <Card className="hover:border-primary/50 transition-colors duration-200">
      <CardContent className="p-5 flex flex-col md:flex-row gap-4 items-start justify-between">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Link 
              href={`/${locale}/preview/${result.id}`}
              className="text-lg font-semibold text-primary hover:underline hover:text-primary/80 transition-colors"
            >
              {result.title}
            </Link>
            <Badge variant={getBadgeVariant(result.status)}>
              {getStatusLabel(result.status)}
            </Badge>
          </div>

          {result.searchPreview ? (
            <p 
              className="text-sm text-foreground/80 bg-muted/30 p-2.5 rounded border border-line/35 font-mono text-xs leading-relaxed"
              dangerouslySetInnerHTML={{ __html: result.searchPreview }}
            />
          ) : (
            result.description && (
              <Text color="muted" className="text-sm">
                {result.description}
              </Text>
            )
          )}

          <div className="flex items-center gap-4 text-xs text-muted-color">
            <span>{result.originalName}</span>
            <span>•</span>
            <span>{formattedSize}</span>
            <span>•</span>
            <span>{formattedDate}</span>
          </div>
        </div>
        
        <Link
          href={`/${locale}/preview/${result.id}`}
          className="self-end md:self-center bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium px-4 py-2 rounded-md transition-colors whitespace-nowrap"
        >
          {tCommon("view")}
        </Link>
      </CardContent>
    </Card>
  );
}
