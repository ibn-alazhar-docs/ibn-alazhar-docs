import { describe, it, expect, vi } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../test-utils";

vi.mock("motion/react", () => {
  const React = require("react");
  const passthrough = (tag: string) =>
    React.forwardRef(({ children, ...props }: any, ref: any) =>
      React.createElement(tag, { ref, ...props }, children),
    );
  return { motion: new Proxy({}, { get: (_t, tag) => passthrough(tag as string) }) };
});

const mockApiClient = vi.hoisted(() => ({
  post: vi.fn(),
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));
vi.mock("@/api/api-client", () => ({ apiClient: mockApiClient }));

import { BookmarkButton } from "@/ui/documents/bookmark-button";

describe("BookmarkButton (component)", () => {
  beforeEach(() => {
    mockApiClient.post.mockReset();
    mockApiClient.post.mockResolvedValue({ bookmarked: true });
  });

  it("renders the outline bookmark icon when not bookmarked", () => {
    renderWithProviders(<BookmarkButton documentId="doc-1" initialBookmarked={false} />);
    expect(screen.getByRole("button", { name: "addBookmark" })).toBeInTheDocument();
  });

  it("renders the check bookmark icon when bookmarked", () => {
    renderWithProviders(<BookmarkButton documentId="doc-1" initialBookmarked />);
    expect(screen.getByRole("button", { name: "removeBookmark" })).toBeInTheDocument();
  });

  it("POSTs to the bookmark endpoint on click", async () => {
    renderWithProviders(<BookmarkButton documentId="doc-42" initialBookmarked={false} />);
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() =>
      expect(mockApiClient.post).toHaveBeenCalledWith("/api/documents/doc-42/bookmark"),
    );
  });

  it("invokes onToggle with the returned bookmarked value", async () => {
    const onToggle = vi.fn();
    renderWithProviders(<BookmarkButton documentId="doc-7" onToggle={onToggle} />);
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(onToggle).toHaveBeenCalledWith(true));
  });

  it("uses optimistic value when query cache already has a value", async () => {
    mockApiClient.post.mockResolvedValue({ bookmarked: false });
    const onToggle = vi.fn();
    renderWithProviders(<BookmarkButton documentId="doc-9" onToggle={onToggle} />);
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(onToggle).toHaveBeenCalledWith(false));
  });
});
