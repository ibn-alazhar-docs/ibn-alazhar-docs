"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "@/i18n/navigation";

const SAFETY_TIMEOUT_MS = 8000;
const FADE_MS = 200;

type Phase = "idle" | "running" | "finishing";

export function RouteProgress() {
  const pathname = usePathname();
  const barRef = useRef<HTMLDivElement>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const phaseRef = useRef<Phase>("idle");
  const [phase, setPhase] = useState<Phase>("idle");

  const setBarPhase = (next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  };

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  const setWidth = (percent: number, durationMs: number) => {
    const el = barRef.current;
    if (!el) return;
    el.style.transition = `width ${durationMs}ms ease-out`;
    el.style.width = `${percent}%`;
  };

  const resetBar = () => {
    const el = barRef.current;
    if (el) {
      el.style.transition = "none";
      el.style.width = "0%";
    }
  };

  const begin = () => {
    clearTimers();
    resetBar();
    setBarPhase("running");
    setWidth(0, 0);
    timersRef.current.push(
      setTimeout(() => setWidth(30, 200), 30),
      setTimeout(() => setWidth(55, 350), 230),
      setTimeout(() => setWidth(72, 500), 580),
      setTimeout(() => setWidth(80, 900), 1080),
      setTimeout(() => finish(), SAFETY_TIMEOUT_MS),
    );
  };

  const finish = () => {
    clearTimers();
    if (phaseRef.current === "idle") return;
    setBarPhase("finishing");
    setWidth(100, 180);
    timersRef.current.push(
      setTimeout(
        () => {
          setBarPhase("idle");
          resetBar();
        },
        180 + FADE_MS + 40,
      ),
    );
  };

  useEffect(() => {
    const isInternalLinkClick = (event: MouseEvent): boolean => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return false;
      }
      const target = event.target;
      if (!(target instanceof Element)) return false;
      const anchor = target.closest("a");
      if (!anchor) return false;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return false;
      if (anchor.target && anchor.target !== "_self") return false;
      if (anchor.hasAttribute("download")) return false;
      if (/^(mailto:|tel:|javascript:)/.test(href)) return false;
      try {
        return new URL(href, window.location.origin).origin === window.location.origin;
      } catch {
        return false;
      }
    };

    const handleClick = (event: MouseEvent) => {
      if (isInternalLinkClick(event)) begin();
    };

    document.addEventListener("click", handleClick, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
      clearTimers();
    };
  }, []);

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    finish();
  }, [pathname]);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px] overflow-hidden"
      aria-hidden="true"
    >
      <div
        ref={barRef}
        className={`h-full w-0 bg-primary-color transition-opacity duration-200 ${
          phase === "idle" ? "opacity-0" : "opacity-100"
        }`}
      />
    </div>
  );
}
