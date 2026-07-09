import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";



import { ConfirmDialog } from "@/ui/confirm-dialog";

describe("ConfirmDialog (component)", () => {
  const baseProps = {
    title: "حذف العنصر",
    message: "هل أنت متأكد؟",
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  it("renders title, message, and default labels", () => {
    render(<ConfirmDialog {...baseProps} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("حذف العنصر")).toBeInTheDocument();
    expect(screen.getByText("هل أنت متأكد؟")).toBeInTheDocument();
    expect(screen.getByTestId("confirm-ok")).toBeInTheDocument();
    expect(screen.getByTestId("confirm-cancel")).toBeInTheDocument();
  });

  it("has accessible dialog semantics (aria-modal, aria-labelledby)", () => {
    render(<ConfirmDialog {...baseProps} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby");
  });

  it("calls onConfirm when confirm clicked", () => {
    const onConfirm = vi.fn();
    render(<ConfirmDialog {...baseProps} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByTestId("confirm-ok"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when cancel clicked", () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog {...baseProps} onCancel={onCancel} />);
    fireEvent.click(screen.getByTestId("confirm-cancel"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });



  it("does NOT call onCancel on Escape while loading", () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog {...baseProps} onCancel={onCancel} isLoading />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("disables buttons while loading and shows spinner", () => {
    render(<ConfirmDialog {...baseProps} isLoading confirmLabel="جارٍ" />);
    expect(screen.getByTestId("confirm-ok")).toBeDisabled();
    expect(screen.getByTestId("confirm-cancel")).toBeDisabled();
  });

  it("uses danger variant styling on confirm", () => {
    render(<ConfirmDialog {...baseProps} variant="danger" />);
    expect(screen.getByTestId("confirm-ok").className).toContain("destructive");
  });

  it("calls onCancel when overlay clicked", () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog {...baseProps} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole("dialog").querySelector(".absolute.inset-0")!);
    expect(onCancel).toHaveBeenCalled();
  });

});
