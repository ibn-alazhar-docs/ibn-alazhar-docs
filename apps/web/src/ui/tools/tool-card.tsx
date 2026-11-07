import { Link } from "@/i18n/navigation";
import { Badge } from "@/ui/badge";
import type { GuestTool } from "@/shared/tools/guest-limits";

interface ToolCardProps {
  tool: GuestTool;
  name: string;
  tagline: string;
  cta: string;
  badge: string;
}

export function ToolCard({ tool, name, tagline, cta, badge }: ToolCardProps) {
  const isLive = tool.status === "available";
  return (
    <article className="flex flex-col rounded-brand-lg border border-line bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-primary-color">{name}</h2>
        <Badge variant={isLive ? "success" : "warning"} className="px-2.5">
          {badge}
        </Badge>
      </div>
      <p className="mb-5 flex-1 text-sm leading-relaxed text-secondary-color">{tagline}</p>
      <Link
        href={`/tools/${tool.slug}`}
        className="landing-btn-primary inline-flex items-center justify-center rounded-brand-md px-4 py-2.5 text-sm font-bold no-underline"
      >
        {cta}
      </Link>
    </article>
  );
}
