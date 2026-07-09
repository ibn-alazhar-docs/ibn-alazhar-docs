import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";



import { CreateFolderDialog } from "@/ui/folders/create-folder-dialog";
import { CONTENT_LIMITS } from "@/shared/constants";

describe("CreateFolderDialog (component)", () => {
  const onSubmit = vi.fn();
  const onClose = vi.fn();

  it("renders heading, input, cancel + create buttons", () => {
    render(<CreateFolderDialog onSubmit={onSubmit} onClose={onClose} />);
    expect(screen.getByText("createNew")).toBeInTheDocument();
    expect(screen.getByLabelText("nameLabel")).toBeInTheDocument();
    expect(screen.getByText("cancel")).toBeInTheDocument();
    expect(screen.getByText("create")).toBeInTheDocument();
  });

  it("shows validation error for empty name and does not submit", () => {
    render(<CreateFolderDialog onSubmit={onSubmit} onClose={onClose} />);
    fireEvent.click(screen.getByText("create"));
    expect(screen.getByText("nameRequired")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows validation error for whitespace-only name", () => {
    render(<CreateFolderDialog onSubmit={onSubmit} onClose={onClose} />);
    const input = screen.getByLabelText("nameLabel") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.click(screen.getByText("create"));
    expect(screen.getByText("nameRequired")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows validation error when name exceeds MAX_FOLDER_NAME_LENGTH", () => {
    render(<CreateFolderDialog onSubmit={onSubmit} onClose={onClose} />);
    const input = screen.getByLabelText("nameLabel") as HTMLInputElement;
    fireEvent.change(input, {
      target: { value: "x".repeat(CONTENT_LIMITS.MAX_FOLDER_NAME_LENGTH + 1) },
    });
    fireEvent.click(screen.getByText("create"));
    expect(screen.getByText("nameTooLong")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("accepts name at the exact length boundary", async () => {
    onSubmit.mockResolvedValueOnce(undefined);
    render(<CreateFolderDialog onSubmit={onSubmit} onClose={onClose} />);
    const input = screen.getByLabelText("nameLabel") as HTMLInputElement;
    const name = "x".repeat(CONTENT_LIMITS.MAX_FOLDER_NAME_LENGTH);
    fireEvent.change(input, { target: { value: name } });
    fireEvent.click(screen.getByText("create"));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(name));
  });

  it("submits trimmed name on valid input", async () => {
    onSubmit.mockResolvedValueOnce(undefined);
    render(<CreateFolderDialog onSubmit={onSubmit} onClose={onClose} />);
    const input = screen.getByLabelText("nameLabel") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "  مجلد جديد  " } });
    fireEvent.click(screen.getByText("create"));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith("مجلد جديد"));
  });

  it("surfaces submission errors thrown by onSubmit", async () => {
    onSubmit.mockRejectedValueOnce(new Error("فشل الإنشاء"));
    render(<CreateFolderDialog onSubmit={onSubmit} onClose={onClose} />);
    const input = screen.getByLabelText("nameLabel") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "مجلد" } });
    fireEvent.click(screen.getByText("create"));
    expect(await screen.findByText("فشل الإنشاء")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("create")).not.toBeDisabled());
  });

  it("closes on Escape key", () => {
    render(<CreateFolderDialog onSubmit={onSubmit} onClose={onClose} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes when overlay (outside dialog) is clicked", () => {
    render(<CreateFolderDialog onSubmit={onSubmit} onClose={onClose} />);
    const overlay = screen.getByRole("dialog");
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when cancel clicked", () => {
    render(<CreateFolderDialog onSubmit={onSubmit} onClose={onClose} />);
    fireEvent.click(screen.getByText("cancel"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("disables create button while submitting", async () => {
    onSubmit.mockImplementationOnce(() => new Promise((r) => setTimeout(r, 50)));
    render(<CreateFolderDialog onSubmit={onSubmit} onClose={onClose} />);
    const input = screen.getByLabelText("nameLabel") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "مجلد" } });
    fireEvent.click(screen.getByText("create"));
    expect(screen.getByText("...")).toBeDisabled();
  });
});
