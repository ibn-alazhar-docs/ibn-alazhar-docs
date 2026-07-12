"use client";

import { useEffect, useId, useRef } from "react";
import { Button } from "@/ui/button";
import { Portal } from "@/ui/portal";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "تأكيد",
  cancelLabel = "إلغاء",
  variant = "default",
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmDialogProps) {
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
      if (e.key === "Escape" && !isLoading) {
        onCancel();
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
  }, [onCancel, isLoading]);

  const titleId = useId();

  return (
    <Portal>
      <div
        ref={dialogRef}
        className="fixed inset-0 z-[100] flex items-center justify-center"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="confirm-dialog"
      >
        <div className="absolute inset-0 bg-overlay" onClick={() => !isLoading && onCancel()} />
        <div className="relative z-10 mx-4 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-line bg-card p-6 shadow-lg">
          <h3 id={titleId} className="text-lg font-semibold text-primary-color">
            {title}
          </h3>
          <p className="mt-2 text-sm text-muted-color">{message}</p>
          <div className="mt-6 flex items-center justify-end gap-4">
            <Button
              type="button"
              onClick={onCancel}
              variant="outline"
              disabled={isLoading}
              data-testid="confirm-cancel"
            >
              {cancelLabel}
            </Button>
            <Button
              type="button"
              onClick={onConfirm}
              variant={variant === "danger" ? "destructive" : "default"}
              disabled={isLoading}
              data-testid="confirm-ok"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  {confirmLabel}
                </span>
              ) : (
                confirmLabel
              )}
            </Button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
