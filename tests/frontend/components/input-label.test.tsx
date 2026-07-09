import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";

describe("Input (component)", () => {
  it("renders a text input by default", () => {
    render(<Input placeholder="اكتب هنا" />);
    const input = screen.getByPlaceholderText("اكتب هنا");
    expect(input.tagName).toBe("INPUT");
  });

  it("reflects value and fires onChange", () => {
    const onChange = vi.fn();
    render(<Input value="مرحبا" onChange={onChange} />);
    const input = screen.getByDisplayValue("مرحبا") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "x" } });
    expect(onChange).toHaveBeenCalled();
  });

  it("honors type, disabled, required", () => {
    render(<Input type="email" disabled required aria-label="email" />);
    const input = screen.getByLabelText("email") as HTMLInputElement;
    expect(input.type).toBe("email");
    expect(input).toBeDisabled();
    expect(input.required).toBe(true);
  });

  it("forwards ref", () => {
    const ref: React.RefObject<HTMLInputElement> = { current: null };
    render(<Input ref={ref as React.Ref<HTMLInputElement>} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it("applies invalid styling hook via aria-invalid", () => {
    render(<Input aria-invalid={true} aria-label="bad" />);
    expect(screen.getByLabelText("bad")).toHaveAttribute("aria-invalid", "true");
  });
});

describe("Label (component)", () => {
  it("renders its text", () => {
    render(<Label>الاسم</Label>);
    expect(screen.getByText("الاسم")).toBeInTheDocument();
  });

  it("associates with an input via htmlFor", () => {
    render(
      <div>
        <Label htmlFor="name">الاسم</Label>
        <Input id="name" />
      </div>,
    );
    const input = screen.getByLabelText("الاسم");
    expect(input).toHaveAttribute("id", "name");
  });

  it("forwards className and ref", () => {
    const ref: React.RefObject<HTMLLabelElement> = { current: null };
    render(
      <Label ref={ref as React.Ref<HTMLLabelElement>} className="lbl-x">
        l
      </Label>,
    );
    expect(ref.current?.className).toContain("lbl-x");
  });
});
