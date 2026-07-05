import { describe, it, expect, vi, beforeEach } from "vitest";
import { SearchUseCases } from "@/core/services/search.use-cases";
import type { ISearchRepository } from "@/domain/repositories/search.repository.interface";
import { ValidationError } from "@/lib/shared/errors";

describe("SearchUseCases", () => {
  let searchRepo: {
    countDocuments: ReturnType<typeof vi.fn>;
    searchDocuments: ReturnType<typeof vi.fn>;
    getTitleSuggestions: ReturnType<typeof vi.fn>;
    getFolderSuggestions: ReturnType<typeof vi.fn>;
    getTagSuggestions: ReturnType<typeof vi.fn>;
  };
  let useCases: SearchUseCases;

  beforeEach(() => {
    searchRepo = {
      countDocuments: vi.fn(),
      searchDocuments: vi.fn(),
      getTitleSuggestions: vi.fn(),
      getFolderSuggestions: vi.fn(),
      getTagSuggestions: vi.fn(),
    };
    useCases = new SearchUseCases(searchRepo as unknown as ISearchRepository);
  });

  describe("search", () => {
    it("returns formatted search results", async () => {
      searchRepo.countDocuments.mockResolvedValue(1);
      searchRepo.searchDocuments.mockResolvedValue([
        {
          id: "doc-1",
          title: "Test Document",
          fileName: "test.pdf",
          status: "COMPLETED",
          pageCount: 5,
          fileSize: 1024,
          outputFormats: ["pdf"],
          createdAt: new Date(),
          folderId: null,
          searchpreview: "This is a test document with content",
          wordcount: 100,
          rank: 0.8,
          folderName: null,
        },
      ]);

      const result = await useCases.search("user-1", "STUDENT", { query: "test" });

      expect(result.total).toBe(1);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].title).toBe("Test Document");
    });

    it("throws ValidationError when query too short", async () => {
      await expect(useCases.search("user-1", "STUDENT", { query: "a" })).rejects.toThrow(
        ValidationError,
      );
    });

    it("throws ValidationError when query is empty", async () => {
      await expect(useCases.search("user-1", "STUDENT", { query: "" })).rejects.toThrow(
        ValidationError,
      );
    });

    it("truncates long excerpts", async () => {
      searchRepo.countDocuments.mockResolvedValue(1);
      const longExcerpt = "word ".repeat(100);
      searchRepo.searchDocuments.mockResolvedValue([
        {
          id: "d1",
          title: "T",
          fileName: "f.pdf",
          status: "COMPLETED",
          pageCount: 1,
          fileSize: 100,
          outputFormats: [],
          createdAt: new Date(),
          folderId: null,
          searchpreview: longExcerpt,
          wordcount: 10,
          rank: 0.5,
          folderName: null,
        },
      ]);

      const result = await useCases.search("user-1", "STUDENT", { query: "test" });

      expect(result.results[0].excerpt.length).toBeLessThanOrEqual(220);
    });

    it("detects matchedIn fields", async () => {
      searchRepo.countDocuments.mockResolvedValue(1);
      searchRepo.searchDocuments.mockResolvedValue([
        {
          id: "d1",
          title: "Hello test",
          fileName: "f.pdf",
          status: "COMPLETED",
          pageCount: 1,
          fileSize: 100,
          outputFormats: [],
          createdAt: new Date(),
          folderId: null,
          searchpreview: "test content here",
          wordcount: 10,
          rank: 0.9,
          folderName: null,
        },
      ]);

      const result = await useCases.search("user-1", "STUDENT", { query: "test" });

      expect(result.results[0].matchedIn).toContain("title");
      expect(result.results[0].matchedIn).toContain("content");
    });
  });

  describe("getSuggestions", () => {
    it("returns combined suggestions sorted by count", async () => {
      searchRepo.getTitleSuggestions.mockResolvedValue([
        { text: "Doc A", type: "title", count: 5n },
      ]);
      searchRepo.getFolderSuggestions.mockResolvedValue([
        { text: "Folder B", type: "folder", count: 3n },
      ]);
      searchRepo.getTagSuggestions.mockResolvedValue([
        { text: "Tag C", type: "tag", count: 10n, id: "t1" },
      ]);

      const result = await useCases.getSuggestions("user-1", "test");

      expect(result).toHaveLength(3);
      expect(result[0].text).toBe("Tag C");
    });

    it("returns empty array for short queries", async () => {
      const result = await useCases.getSuggestions("user-1", "a");

      expect(result).toEqual([]);
    });

    it("caps results at 8", async () => {
      const manySuggestions = Array.from({ length: 20 }, (_, i) => ({
        text: `Item ${i}`,
        type: "title",
        count: BigInt(i),
      }));
      searchRepo.getTitleSuggestions.mockResolvedValue(manySuggestions);
      searchRepo.getFolderSuggestions.mockResolvedValue([]);
      searchRepo.getTagSuggestions.mockResolvedValue([]);

      const result = await useCases.getSuggestions("user-1", "test");

      expect(result).toHaveLength(8);
    });
  });
});
