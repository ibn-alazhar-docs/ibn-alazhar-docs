import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuthPageShell } from "@/app/[locale]/(auth)/auth-page-shell";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...props }: { children: React.ReactNode; href: string }) =>
    React.createElement("a", { href, ...props }, children),
}));

vi.mock("@/ui/brand-logo", () => ({
  BrandLogo: ({ alt }: { alt: string }) => <span data-testid="brand-logo">{alt}</span>,
}));

describe("AuthPageShell (parity)", () => {
  it("renders title, subtitle, children, logo alt and home link with the shared classes", () => {
    const { container } = render(
      <AuthPageShell title="تسجيل الدخول" logoAlt="ابن الأزهر" subtitle="وصف الصفحة">
        <div data-testid="form">النموذج</div>
      </AuthPageShell>,
    );
    expect(screen.getByRole("heading", { level: 2, name: "تسجيل الدخول" })).toBeInTheDocument();
    expect(screen.getByText("وصف الصفحة")).toBeInTheDocument();
    expect(screen.getByTestId("form")).toBeInTheDocument();
    expect(screen.getByTestId("brand-logo")).toHaveTextContent("ابن الأزهر");
    expect(screen.getByRole("link", { name: "ابن الأزهر" })).toHaveAttribute("href", "/");
    const shell = container.firstElementChild;
    expect(shell).toHaveClass("text-center");
    expect(container.querySelector(".gold-divider")).toBeInTheDocument();
    expect(shell?.querySelector("h2.heading-display")).toBeInTheDocument();
    expect(screen.getByText("وصف الصفحة").closest("p")).toHaveClass(
      "mt-2",
      "text-sm",
      "text-muted-color",
    );
  });

  it("renders a link subtitle (login/register style) unchanged", () => {
    render(
      <AuthPageShell
        title="تسجيل الدخول"
        logoAlt="ابن الأزهر"
        subtitle={
          <>
            ليس لديك حساب؟{" "}
            <a href="/register" className="font-semibold text-gold">
              إنشاء حساب
            </a>
          </>
        }
      >
        <div data-testid="form">النموذج</div>
      </AuthPageShell>,
    );
    expect(screen.getByRole("link", { name: "إنشاء حساب" })).toHaveAttribute("href", "/register");
    expect(screen.getByText("ليس لديك حساب؟")).toBeInTheDocument();
  });
});
