"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Portal } from "@/ui/portal";

// PARITY SURVEY (U08 / FR-008 lens C) — five hand-rolled dialogs audited:
// 1. confirm-dialog.tsx — separate backdrop (`absolute inset-0 bg-overlay`),
//    document keydown Esc (blocked while loading), focus trap + restore,
//    no `isOpen` gating, fixed `mx-4` panel without `p-4` on the container.
// 2. create-folder-dialog.tsx — combined backdrop (`bg-overlay` on the outer
//    flex container, `onClick={target === currentTarget}`), document keydown
//    Esc, `autoFocus` input, form children, no trap/restore.
// 3. move-dialog.tsx — combined backdrop like (2), Esc bound via `onKeyDown`
//    on the backdrop div (fires only when focus is inside), skeleton loading,
//    no trap/restore.
// 4. export-modal.tsx — `isOpen` early-return gating, separate backdrop with
//    `backdrop-blur-sm`, `animate-in fade-in zoom-in-95` panel, responsive
//    `p-3/sm:p-4/md:p-6` paddings, raw <button> footer, no trap/restore.
// 5. share-modal.tsx — `isOpen` gating via `AnimatePresence`, separate
//    `motion.div` backdrop + spring `motion.div` panel, icon-circle header,
//    raw <button> footer, no trap/restore.
// Only (1) shares the exact shape below, so Dialog is the single shell for it
// and is the only dialog migrated in this PARITY unit. The override props
// (container/backdrop/panel classNames, `disabled`, `labelledBy`) let the
// other four adopt Dialog later without token/color changes.

interface DialogProps {
  children: ReactNode;
  labelledBy: string;
  onClose: () => void;
  disabled?: boolean;
  testId?: string;
  containerClassName?: string;
  backdropClassName?: string;
  panelClassName?: string;
}

const CONTAINER_CLASS = "fixed inset-0 z-[100] flex items-center justify-center";
const BACKDROP_CLASS = "absolute inset-0 bg-overlay";
const PANEL_CLASS =
  "relative z-10 mx-4 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-line bg-card p-6 shadow-lg";

export function Dialog({
  children,
  labelledBy,
  onClose,
  disabled = false,
  testId,
  containerClassName,
  backdropClassName,
  panelClassName,
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusable = dialog.querySelectorAll<HTMLElement>(
      'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
    );
    if (focusable.length > 0) focusable[0]!.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !disabled) {
        onClose();
        return;
      }
      if (e.key !== "Tab" || focusable.length === 0) return;

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [onClose, disabled]);

  return (
    <Portal>
      <div
        ref={dialogRef}
        className={containerClassName ?? CONTAINER_CLASS}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        data-testid={testId}
      >
        <div
          className={backdropClassName ?? BACKDROP_CLASS}
          onClick={() => !disabled && onClose()}
        />
        <div className={panelClassName ?? PANEL_CLASS}>{children}</div>
      </div>
    </Portal>
  );
}
