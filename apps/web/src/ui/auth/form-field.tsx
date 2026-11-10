"use client";

import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/ui/cn";

// PARITY SURVEY (U08 / FR-008 lens C) — the 4 auth forms share one field
// shape: `mb-2 block text-xs font-bold text-muted-color` label +
// gold-focus input + `mt-1.5 text-xs text-danger` error line with
// `aria-invalid` / `aria-describedby`. Differences are data, not structure:
// - login inputs carry `disabled` + `disabled:opacity-50`; the other three
//   carry neither on the <input> (only the submit button is disabled).
// - forgot/reset labels/inputs have no `htmlFor`/`id`; login/register do.
// - login password adds a forgot-password link beside the label instead of
//   the plain label (`labelExtra`, flex row).
// FormField renders the exact same classes/DOM for each case: pass `id` for
// `htmlFor`, `disabled` to get `disabled:opacity-50`, `labelExtra` for the
// login password row, `error`/`errorId` for the error line.

export interface FormFieldProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "id" | "className" | "aria-invalid" | "aria-describedby"
  > {
  id?: string;
  name: string;
  label: ReactNode;
  error?: string;
  errorId?: string;
  inputClassName?: string;
  labelExtra?: ReactNode;
}

export function FormField({
  id,
  name,
  label,
  error,
  errorId,
  inputClassName,
  labelExtra,
  disabled,
  dir = "ltr",
  ...inputProps
}: FormFieldProps) {
  const resolvedErrorId = errorId ?? `${name}-error`;
  const labelNode = (
    <label
      htmlFor={id}
      className={
        labelExtra
          ? "text-xs font-bold text-muted-color"
          : "mb-2 block text-xs font-bold text-muted-color"
      }
    >
      {label}
    </label>
  );

  return (
    <div>
      {labelExtra ? (
        <div className="flex items-center justify-between mb-2">
          {labelNode}
          {labelExtra}
        </div>
      ) : (
        labelNode
      )}
      <input
        id={id}
        name={name}
        dir={dir}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={error ? resolvedErrorId : undefined}
        className={cn(
          "w-full rounded-lg border border-line bg-page ps-4 pe-4 py-3 text-sm text-primary-color placeholder:text-very-muted focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/30",
          disabled && "disabled:opacity-50",
          "transition-colors",
          inputClassName,
        )}
        {...inputProps}
      />
      {error && (
        <p className="mt-1.5 text-xs text-danger" id={resolvedErrorId} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
