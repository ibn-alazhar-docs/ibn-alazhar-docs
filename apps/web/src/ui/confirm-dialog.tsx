"use client";

import { useId } from "react";
import { Button } from "@/ui/button";
import { Dialog } from "@/ui/dialog";

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
  const titleId = useId();

  return (
    <Dialog labelledBy={titleId} onClose={onCancel} disabled={isLoading} testId="confirm-dialog">
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
    </Dialog>
  );
}
