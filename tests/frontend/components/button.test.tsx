import { describe, it, expect, vi } from "vitest";
import { createRef } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "@/ui/button";

describe("Button (component)", () => {
  it("renders children", () => {
    render(<Button>حفظ</Button>);
    expect(screen.getByRole("button", { name: "حفظ" })).toBeInTheDocument();
  });

  it("forwards a ref to the underlying button", () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Button ref={ref}>x</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it("applies the default variant classes", () => {
    render(<Button>d</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("bg-primary");
  });

  it.each(["destructive", "outline", "secondary", "ghost", "link"] as const)(
    "applies variant=%s classes",
    (variant) => {
      render(<Button variant={variant}>v</Button>);
      const cls = screen.getByRole("button").className;
      if (variant === "destructive") expect(cls).toContain("bg-destructive");
      if (variant === "outline") expect(cls).toContain("border-line");
      if (variant === "secondary") expect(cls).toContain("bg-secondary");
      if (variant === "ghost") expect(cls).toContain("hover:bg-muted");
      if (variant === "link") expect(cls).toContain("underline-offset-4");
    },
  );

  it.each(["sm", "lg", "icon"] as const)("applies size=%s classes", (size) => {
    render(<Button size={size}>s</Button>);
    const cls = screen.getByRole("button").className;
    if (size === "sm") expect(cls).toContain("h-9");
    if (size === "lg") expect(cls).toContain("h-11");
    if (size === "icon") expect(cls).toContain("w-10");
  });

  it("is disabled and sets aria-disabled when disabled", () => {
    render(<Button disabled>off</Button>);
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("disabled");
  });

  it("fires onClick", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>go</Button>);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not fire onClick when disabled", () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        go
      </Button>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("merges custom className", () => {
    render(<Button className="custom-x">c</Button>);
    expect(screen.getByRole("button").className).toContain("custom-x");
  });

  it("renders as child via asChild (Slot clone)", () => {
    render(
      <Button asChild>
        <a href="/x">link</a>
      </Button>,
    );
    const link = screen.getByRole("link", { name: "link" });
    expect(link).toHaveAttribute("href", "/x");
    expect(link.className).toContain("bg-primary");
  });

  it("passes through native button attributes (type, aria-label)", () => {
    render(
      <Button type="submit" aria-label="submit-btn">
        s
      </Button>,
    );
    const btn = screen.getByRole("button", { name: "submit-btn" });
    expect(btn).toHaveAttribute("type", "submit");
  });
});
