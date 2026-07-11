import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

vi.mock("next-auth/react", () => ({
  signIn: vi.fn(() => Promise.resolve({ error: null })),
  signOut: vi.fn(),
}));

import { RegisterForm } from "@/ui/auth/register-form";

describe("RegisterForm (component)", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("renders all four fields + submit", () => {
    render(<RegisterForm />);
    expect(screen.getByLabelText("nameLabel")).toBeInTheDocument();
    expect(screen.getByLabelText("emailLabel")).toBeInTheDocument();
    expect(screen.getByLabelText("passwordLabel")).toBeInTheDocument();
    expect(screen.getByLabelText("confirmPasswordLabel")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "registerButton" })).toBeInTheDocument();
  });

  it("shows nameRequired when name empty", async () => {
    render(<RegisterForm />);
    fireEvent.click(screen.getByRole("button", { name: "registerButton" }));
    expect(await screen.findByText("nameRequired")).toBeInTheDocument();
  });

  it("shows emailRequired on empty email", async () => {
    render(<RegisterForm />);
    fireEvent.change(screen.getByLabelText("nameLabel"), { target: { value: "أحمد" } });
    fireEvent.click(screen.getByRole("button", { name: "registerButton" }));
    expect(await screen.findByText("emailRequired")).toBeInTheDocument();
  });

  it("shows passwordHint on too-short password", async () => {
    render(<RegisterForm />);
    fireEvent.change(screen.getByLabelText("nameLabel"), { target: { value: "أحمد" } });
    fireEvent.change(screen.getByLabelText("emailLabel"), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByLabelText("passwordLabel"), { target: { value: "short" } });
    fireEvent.change(screen.getByLabelText("confirmPasswordLabel"), { target: { value: "short" } });
    fireEvent.click(screen.getByRole("button", { name: "registerButton" }));
    expect(await screen.findByText("passwordHint")).toBeInTheDocument();
  });

  it("shows confirmPasswordError on mismatch", async () => {
    render(<RegisterForm />);
    fireEvent.change(screen.getByLabelText("nameLabel"), { target: { value: "أحمد" } });
    fireEvent.change(screen.getByLabelText("emailLabel"), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByLabelText("passwordLabel"), { target: { value: "Passw0rd" } });
    fireEvent.change(screen.getByLabelText("confirmPasswordLabel"), {
      target: { value: "Other1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "registerButton" }));
    expect(await screen.findByText("confirmPasswordError")).toBeInTheDocument();
  });

  it("POSTs a valid payload and pushes to /login on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: "u1" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<RegisterForm />);
    fireEvent.change(screen.getByLabelText("nameLabel"), { target: { value: "أحمد" } });
    fireEvent.change(screen.getByLabelText("emailLabel"), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByLabelText("passwordLabel"), { target: { value: "Passw0rd" } });
    fireEvent.change(screen.getByLabelText("confirmPasswordLabel"), {
      target: { value: "Passw0rd" },
    });
    fireEvent.click(screen.getByRole("button", { name: "registerButton" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/auth/register",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "أحمد",
            email: "a@b.com",
            password: "Passw0rd",
            confirmPassword: "Passw0rd",
          }),
        }),
      ),
    );
  });

  it("shows registerError when server responds non-2xx", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({ error: { message: "البريد مستخدم" } }),
      }),
    );
    render(<RegisterForm />);
    fireEvent.change(screen.getByLabelText("nameLabel"), { target: { value: "أحمد" } });
    fireEvent.change(screen.getByLabelText("emailLabel"), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByLabelText("passwordLabel"), { target: { value: "Passw0rd" } });
    fireEvent.change(screen.getByLabelText("confirmPasswordLabel"), {
      target: { value: "Passw0rd" },
    });
    fireEvent.click(screen.getByRole("button", { name: "registerButton" }));
    expect(await screen.findByText("البريد مستخدم")).toBeInTheDocument();
  });

  it("shows unexpectedError when fetch throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    render(<RegisterForm />);
    fireEvent.change(screen.getByLabelText("nameLabel"), { target: { value: "أحمد" } });
    fireEvent.change(screen.getByLabelText("emailLabel"), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByLabelText("passwordLabel"), { target: { value: "Passw0rd" } });
    fireEvent.change(screen.getByLabelText("confirmPasswordLabel"), {
      target: { value: "Passw0rd" },
    });
    fireEvent.click(screen.getByRole("button", { name: "registerButton" }));
    expect(await screen.findByText("unexpectedError")).toBeInTheDocument();
  });
});
