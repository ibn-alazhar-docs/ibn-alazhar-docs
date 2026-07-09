import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useSearchParams } from "next/navigation";


vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(() => ({ get: () => null })),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

import { signIn } from "next-auth/react";
import { LoginForm } from "@/ui/auth/login-form";

describe("LoginForm (component)", () => {
  beforeEach(() => {
    vi.mocked(signIn).mockReset();
    vi.mocked(signIn).mockResolvedValue({ error: null });
  });

  it("renders email + password fields and submit button", () => {
    render(<LoginForm />);
    expect(screen.getByLabelText("emailLabel")).toBeInTheDocument();
    expect(screen.getByLabelText("passwordLabel")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "loginButton" })).toBeInTheDocument();
  });

  it("hides Google button when client id is absent", () => {
    render(<LoginForm />);
    expect(screen.queryByRole("button", { name: "continueWithGoogle" })).not.toBeInTheDocument();
  });

  it("shows emailRequired when email empty", async () => {
    render(<LoginForm />);
    await userEvent.click(screen.getByRole("button", { name: "loginButton" }));
    expect(await screen.findByText("emailRequired")).toBeInTheDocument();
    expect(vi.mocked(signIn)).not.toHaveBeenCalled();
  });

  it("shows passwordRequired when password empty", async () => {
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText("emailLabel"), "user@example.com");
    await userEvent.click(screen.getByRole("button", { name: "loginButton" }));
    expect(await screen.findByText("passwordRequired")).toBeInTheDocument();
    expect(vi.mocked(signIn)).not.toHaveBeenCalled();
  });

  it("shows validationError for malformed email", async () => {
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText("emailLabel"), "not-an-email");
    await userEvent.type(screen.getByLabelText("passwordLabel"), "Password1");
    const button = screen.getByRole("button", { name: "loginButton" });
    await userEvent.click(button);
    expect(await screen.findByText("validationError")).toBeInTheDocument();
    expect(vi.mocked(signIn)).not.toHaveBeenCalled();
  });

  it("calls signIn with credentials on valid submit", async () => {
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText("emailLabel"), "user@example.com");
    await userEvent.type(screen.getByLabelText("passwordLabel"), "Password1");
    const button = screen.getByRole("button", { name: "loginButton" });
    await userEvent.click(button);
    await waitFor(() =>
      expect(vi.mocked(signIn)).toHaveBeenCalledWith("credentials", {
        email: "user@example.com",
        password: "Password1",
        redirect: false,
        redirectTo: "/dashboard",
      }),
    );
  });

  it("shows loginError when signIn returns an error", async () => {
    vi.mocked(signIn).mockResolvedValue({ error: "CredentialsSignin" });
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText("emailLabel"), "user@example.com");
    await userEvent.type(screen.getByLabelText("passwordLabel"), "WrongPass1");
    const button = screen.getByRole("button", { name: "loginButton" });
    await userEvent.click(button);
    expect(await screen.findByText("loginError")).toBeInTheDocument();
  });

  it("sets aria-invalid + aria-describedby on invalid email field", async () => {
    render(<LoginForm />);
    await userEvent.click(screen.getByRole("button", { name: "loginButton" }));
    const email = await screen.findByLabelText("emailLabel");
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(email).toHaveAttribute("aria-describedby", "email-error");
    expect(screen.getByText("emailRequired")).toHaveAttribute("role", "alert");
  });

  it("renders a registered success banner when ?registered=true", () => {
    vi.mocked(useSearchParams).mockReturnValueOnce({
      get: (k: string) => (k === "registered" ? "true" : null),
    } as never);
    render(<LoginForm />);
    expect(screen.getByText("autoLoginError")).toBeInTheDocument();
  });
});
