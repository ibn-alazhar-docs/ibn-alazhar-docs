import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from "vitest";
import { prisma, createTestUser, createTestDocument, cleanupTestUsers } from "./helpers/db";

describe("Search → PostgreSQL Integration", () => {
  let userA: { id: string };
  let userB: { id: string };
  const userIds: string[] = [];

  beforeAll(async () => {
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='documents' AND column_name='searchvector'
        ) THEN
          ALTER TABLE documents ADD COLUMN searchvector tsvector;
          ALTER TABLE documents ADD COLUMN searchpreview text;
          ALTER TABLE documents ADD COLUMN wordcount integer;
          CREATE INDEX IF NOT EXISTS documents_searchvector_idx ON documents USING gin(searchvector);
        END IF;
      END $$;
    `);
  });

  beforeEach(async () => {
    userA = await createTestUser({ name: "Search User A" });
    userB = await createTestUser({ name: "Search User B" });
    userIds.push(userA.id, userB.id);
  });

  afterEach(async () => {
    await cleanupTestUsers(userIds);
    userIds.length = 0;
  });

  async function updateSearchVector(id: string, title: string, description?: string) {
    return prisma.$executeRaw`
      UPDATE documents
      SET searchvector =
        setweight(to_tsvector('simple', coalesce(${title}, '')), 'A') ||
        setweight(to_tsvector('simple', coalesce("fileName", '')), 'B') ||
        setweight(to_tsvector('simple', coalesce(${description || ""}, '')), 'C')
      WHERE id = ${id}
    `;
  }

  async function searchDocs(
    userId: string,
    query: string,
  ): Promise<{ id: string; title: string; rank: number }[]> {
    const tsQuery = query.split(/\s+/).filter(Boolean).join(" & ");

    return prisma.$queryRawUnsafe(
      `SELECT d.id, d.title, ts_rank(d.searchvector, to_tsquery('simple', $2)) AS rank
       FROM documents d
       WHERE d."userId" = $1 AND d."deletedAt" IS NULL
         AND (d.searchvector @@ to_tsquery('simple', $2) OR d.title ILIKE '%' || $3 || '%')
       ORDER BY rank DESC, d."createdAt" DESC`,
      userId,
      tsQuery,
      query,
    );
  }

  describe("Search vector updates", () => {
    it("updating title creates a search vector", async () => {
      const doc = await createTestDocument(userA.id, { title: "كتاب التوحيد" });
      await updateSearchVector(doc.id, "كتاب التوحيد");

      const results = await searchDocs(userA.id, "التوحيد");
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.some((r) => r.id === doc.id)).toBe(true);
    });

    it("updating title updates the search vector", async () => {
      const doc = await createTestDocument(userA.id, { title: "كتاب التوحيد" });
      await updateSearchVector(doc.id, "كتاب التوحيد");

      await prisma.document.update({ where: { id: doc.id }, data: { title: "كتاب الفقه" } });
      await updateSearchVector(doc.id, "كتاب الفقه");

      const oldResults = await searchDocs(userA.id, "التوحيد");
      expect(oldResults.some((r) => r.id === doc.id)).toBe(false);

      const newResults = await searchDocs(userA.id, "الفقه");
      expect(newResults.some((r) => r.id === doc.id)).toBe(true);
    });

    it("description contributes to search results", async () => {
      const doc = await createTestDocument(userA.id, {
        title: "عنوان عادي",
        description: "هذا الكتاب يتناول موضوع العقيدة الاسلامية",
      });
      await updateSearchVector(doc.id, "عنوان عادي", "هذا الكتاب يتناول موضوع العقيدة الاسلامية");

      const results = await searchDocs(userA.id, "العقيدة");
      expect(results.some((r) => r.id === doc.id)).toBe(true);
    });
  });

  describe("Ownership-scoped search", () => {
    it("user A search does not return user B's documents", async () => {
      const docB = await createTestDocument(userB.id, { title: "كتاب خاص بالمستخدم ب" });
      await updateSearchVector(docB.id, "كتاب خاص بالمستخدم ب");

      const results = await searchDocs(userA.id, "خاص");
      expect(results.some((r) => r.id === docB.id)).toBe(false);
    });

    it("each user only sees their own search results", async () => {
      const docA = await createTestDocument(userA.id, { title: "تفسير ابن كثير" });
      await updateSearchVector(docA.id, "تفسير ابن كثير");

      const docB = await createTestDocument(userB.id, { title: "تفسير الطبري" });
      await updateSearchVector(docB.id, "تفسير الطبري");

      const resultsA = await searchDocs(userA.id, "تفسير");
      expect(resultsA).toHaveLength(1);
      expect(resultsA[0].id).toBe(docA.id);

      const resultsB = await searchDocs(userB.id, "تفسير");
      expect(resultsB).toHaveLength(1);
      expect(resultsB[0].id).toBe(docB.id);
    });
  });

  describe("Soft-deleted docs excluded from search", () => {
    it("deleted documents not found in search", async () => {
      const doc = await createTestDocument(userA.id, { title: "كتاب مؤقت" });
      await updateSearchVector(doc.id, "كتاب مؤقت");

      await prisma.document.update({
        where: { id: doc.id },
        data: { deletedAt: new Date() },
      });

      const results = await searchDocs(userA.id, "مؤقت");
      expect(results.some((r) => r.id === doc.id)).toBe(false);
    });
  });

  describe("Search ranking", () => {
    it("title match ranks higher than description match", async () => {
      const doc1 = await createTestDocument(userA.id, {
        title: "التوحيد وأهميته",
        description: "كتاب عام",
      });
      await updateSearchVector(doc1.id, "التوحيد وأهميته", "كتاب عام");

      const doc2 = await createTestDocument(userA.id, {
        title: "كتاب مختلف",
        description: "يتناول التوحيد في الاسلام",
      });
      await updateSearchVector(doc2.id, "كتاب مختلف", "يتناول التوحيد في الاسلام");

      const results = await searchDocs(userA.id, "التوحيد");
      expect(results.length).toBeGreaterThanOrEqual(2);
      expect(results[0].id).toBe(doc1.id);
    });
  });

  describe("Arabic normalization in search", () => {
    it("normalized alef forms found in search", async () => {
      const doc = await createTestDocument(userA.id, { title: "القرآن الكريم" });

      const normalizedTitle = "القرآن الكريم"
        .replace(/[أإآ]/g, "ا")
        .replace(/ة/g, "ه")
        .replace(/ى/g, "ي");

      await updateSearchVector(doc.id, normalizedTitle);

      const normalizedQuery = "القران".replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي");

      const results = await searchDocs(userA.id, normalizedQuery);
      expect(results.some((r) => r.id === doc.id)).toBe(true);
    });
  });
});
