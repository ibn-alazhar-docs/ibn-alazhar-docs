"use client";

import { useEffect, useState, useRef } from "react";
import { useTranslations } from "next-intl";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

export function TOC() {
  const t = useTranslations("discovery");
  const [items, setItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const elements = document.querySelectorAll<HTMLElement>(".reading-prose h2, .reading-prose h3");
    const tocItems: TocItem[] = [];

    elements.forEach((el) => {
      if (el.id) {
        tocItems.push({
          id: el.id,
          text: el.textContent ?? "",
          level: Number(el.tagName.slice(1)),
        });
      }
    });

    setItems(tocItems);

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      {
        rootMargin: "-80px 0px -70% 0px",
        threshold: 0,
      },
    );

    elements.forEach((el) => {
      if (el.id) {
        observerRef.current?.observe(el);
      }
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  if (items.length === 0) return null;

  return (
    <nav className="toc" aria-label={t("tocAriaLabel")}>
      <div className="toc-title">{t("tocTitle")}</div>
      <ul className="toc-list">
        {items.map((item) => (
          <li key={item.id} className={`toc-item toc-item-h${item.level}`}>
            <a
              href={`#${item.id}`}
              className={`toc-link ${activeId === item.id ? "active" : ""}`}
              onClick={(e) => handleClick(e, item.id)}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
