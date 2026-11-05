import { Link } from "@/i18n/navigation";
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
    <article className="flex flex-col rounded-2xl border border-[var(--border-color,rgba(0,0,0,0.08))] bg-[var(--card-bg,#fff)] p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-primary-color">{name}</h2>
        <span
          className={
            isLive
              ? "rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800"
              : "rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800"
          }
        >
          {badge}
        </span>
      </div>
      <p className="mb-5 flex-1 text-sm leading-relaxed text-secondary-color">{tagline}</p>
      <Link
        href={`/tools/${tool.slug}`}
        className="landing-btn-primary inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-bold no-underline"
      >
        {cta}
      </Link>
    </article>
  );
}
