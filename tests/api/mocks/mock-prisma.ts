import { randomBytes } from "node:crypto";

// In-memory store: tableName -> Map<id, record>
type TableStore = Map<string, Record<string, unknown>>;
const store = new Map<string, TableStore>();

function getTable(name: string): TableStore {
  if (!store.has(name)) store.set(name, new Map());
  return store.get(name)!;
}

let idCounter = 0;
function cuid(): string {
  return `clx${Date.now()}${++idCounter}${randomBytes(4).toString("hex")}`;
}

function matchesWhere(record: Record<string, unknown>, where: Record<string, unknown>): boolean {
  for (const [key, value] of Object.entries(where)) {
    // Top-level operators (key === "not")
    if (key === "in") continue;
    if (key === "contains" || key === "startsWith" || key === "endsWith" || key === "mode")
      continue;
    if (
      key === "not" &&
      typeof value === "object" &&
      value !== null &&
      "in" in (value as Record<string, unknown>)
    ) {
      const notIn = (value as Record<string, unknown>).in as unknown[];
      if (notIn.includes(record[key])) return false;
      continue;
    }
    if (key === "not" && (typeof value !== "object" || value === null)) {
      if (record[key] === value) return false;
      continue;
    }

    // Field-level operators: value is an object with Prisma filter clauses
    if (typeof value === "object" && value !== null) {
      const valObj = value as Record<string, unknown>;

      // { not: { in: [...] } } — not-in
      if ("not" in valObj) {
        const notVal = valObj.not;
        if (
          typeof notVal === "object" &&
          notVal !== null &&
          "in" in (notVal as Record<string, unknown>)
        ) {
          const notIn = (notVal as Record<string, unknown>).in as unknown[];
          if (notIn.includes(record[key])) return false;
          continue;
        }
        // { not: <scalar> } — exclude if record[key] equals notVal
        if (typeof notVal !== "object" || notVal === null) {
          if (record[key] === notVal) return false;
          continue;
        }
      }

      // { equals: <value>, mode?: "insensitive" }
      if ("equals" in valObj) {
        const equalsVal = valObj.equals;
        const mode = valObj.mode as string | undefined;
        if (mode === "insensitive") {
          if (String(record[key] ?? "").toLowerCase() !== String(equalsVal ?? "").toLowerCase())
            return false;
        } else {
          if (record[key] !== equalsVal) return false;
        }
        continue;
      }

      // { in: [...] }
      if ("in" in valObj) {
        const arr = valObj.in as unknown[];
        if (!arr.includes(record[key])) return false;
        continue;
      }

      // { contains: <str>, mode?: "insensitive" }
      if ("contains" in valObj) {
        const target = valObj.contains as string;
        const mode = valObj.mode as string | undefined;
        const field = String(record[key] ?? "");
        if (mode === "insensitive") {
          if (!field.toLowerCase().includes(target.toLowerCase())) return false;
        } else {
          if (!field.includes(target)) return false;
        }
        continue;
      }
    }

    // Plain value comparison — treat undefined as null for Prisma semantics
    if ((record[key] ?? null) !== (value ?? null)) return false;
  }
  return true;
}

function findMany(tableName: string, where?: Record<string, unknown>): Record<string, unknown>[] {
  const table = getTable(tableName);
  if (!where || Object.keys(where).length === 0) return Array.from(table.values());
  return Array.from(table.values()).filter((r) => matchesWhere(r, where));
}

function findUnique(
  tableName: string,
  where: Record<string, unknown>,
): Record<string, unknown> | null {
  const table = getTable(tableName);
  // Try id lookup first
  if (where.id && typeof where.id === "string") {
    return table.get(where.id) ?? null;
  }
  // Compound unique lookups
  for (const record of table.values()) {
    if (matchesWhere(record, where)) return record;
  }
  return null;
}

function create(tableName: string, data: Record<string, unknown>): Record<string, unknown> {
  const table = getTable(tableName);
  const id = (data.id as string) || cuid();
  const now = new Date();
  const record = { createdAt: now, updatedAt: now, ...data, id };
  table.set(id, record);
  return record;
}

function update(
  tableName: string,
  where: Record<string, unknown>,
  data: Record<string, unknown>,
): Record<string, unknown> {
  const existing = findUnique(tableName, where);
  if (!existing) throw new Error(`Record not found in ${tableName}`);
  const table = getTable(tableName);
  const updated = { ...existing, ...data };
  table.set(existing.id as string, updated);
  return updated;
}

function updateMany(
  tableName: string,
  where: Record<string, unknown>,
  data: Record<string, unknown>,
): number {
  const records = findMany(tableName, where);
  const table = getTable(tableName);
  for (const record of records) {
    table.set(record.id as string, { ...record, ...data });
  }
  return records.length;
}

function deleteMany(tableName: string, where?: Record<string, unknown>): number {
  const table = getTable(tableName);
  if (!where || Object.keys(where).length === 0) {
    const count = table.size;
    table.clear();
    return count;
  }
  const toDelete = findMany(tableName, where);
  for (const record of toDelete) {
    table.delete(record.id as string);
  }
  return toDelete.length;
}

function createMany(tableName: string, data: Record<string, unknown>[]): number {
  let count = 0;
  for (const item of data) {
    create(tableName, item);
    count++;
  }
  return count;
}

function count(tableName: string, where?: Record<string, unknown>): number {
  return findMany(tableName, where).length;
}

// Map Prisma model names to table names
const tableMap: Record<string, string> = {
  user: "user",
  document: "document",
  folder: "folder",
  tag: "tag",
  tagDocument: "tagDocument",
  conversionJob: "conversionJob",
  shareLink: "shareLink",
  userSetting: "userSetting",
  account: "account",
  session: "session",
  bookmark: "bookmark",
  webhook: "webhook",
  webhookDelivery: "webhookDelivery",
  auditLog: "auditLog",
};

// Build a Prisma-like client that intercepts model access
function createModelProxy(tableName: string) {
  // Helper to populate included relations on a single record
  function populateInclude(
    record: Record<string, unknown>,
    include?: Record<string, unknown>,
  ): Record<string, unknown> {
    if (!include || typeof include !== "object" || !record) return record;
    const result = { ...record };
    for (const [relName, relOpts] of Object.entries(include)) {
      if (typeof relOpts !== "object" || relOpts === null) {
        // Simple include: e.g. { tag: true } or { document: true }
        if (relOpts === true) {
          // Resolve the relation FK if possible
          if (relName === "document" && tableName === "tagDocument" && result.documentId) {
            result.document = findUnique("document", { id: result.documentId }) ?? null;
            continue;
          }
          if (relName === "tag" && tableName === "tagDocument" && result.tagId) {
            result.tag = findUnique("tag", { id: result.tagId }) ?? null;
            continue;
          }
          if (relName === "folder" && tableName === "document" && result.folderId) {
            result.folder = findUnique("folder", { id: result.folderId }) ?? null;
            continue;
          }
          if (relName === "user" && tableName === "document" && result.userId) {
            result.user = findUnique("user", { id: result.userId }) ?? null;
            continue;
          }
        }
        continue;
      }
      // Document.tags → tagDocument records with nested tag
      if (relName === "tags" && tableName === "document") {
        const tagDocs = findMany("tagDocument", { documentId: result.id });
        const innerInclude = (relOpts as Record<string, unknown>).include as
          | Record<string, unknown>
          | undefined;
        result.tags = tagDocs.map((td) => {
          const enriched = { ...td };
          if (innerInclude?.tag) {
            enriched.tag = findUnique("tag", { id: td.tagId }) ?? null;
          }
          return enriched;
        });
        continue;
      }
      if (relName === "tag" && tableName === "tagDocument") {
        // tagDocument.tag → look up tag by tagId
        if (result.tagId) {
          result.tag = findUnique("tag", { id: result.tagId }) ?? null;
        }
        continue;
      }
      if (relName === "document" && tableName === "tagDocument") {
        // tagDocument.document → look up document by documentId
        if (result.documentId) {
          result.document = findUnique("document", { id: result.documentId }) ?? null;
        }
        continue;
      }
      if (relName === "document" && tableName === "shareLink") {
        // shareLink.document → look up document by documentId
        if (result.documentId) {
          const doc = findUnique("document", { id: result.documentId });
          const select = (relOpts as Record<string, unknown>).select as
            | Record<string, unknown>
            | undefined;
          if (select && typeof select === "object") {
            // Only include selected fields
            const picked: Record<string, unknown> = {};
            for (const [k, v] of Object.entries(select)) {
              if (v === true) picked[k] = doc?.[k];
            }
            result.document = picked;
          } else {
            result.document = doc ?? null;
          }
        }
        continue;
      }
      if (relName === "user" && tableName === "document") {
        if (result.userId) {
          result.user = findUnique("user", { id: result.userId }) ?? null;
        }
        continue;
      }
      if (relName === "folder" && tableName === "document") {
        if (result.folderId) {
          result.folder = findUnique("folder", { id: result.folderId }) ?? null;
        }
        continue;
      }
      if (relName === "owner" && tableName === "folder") {
        if (result.userId) {
          result.owner = findUnique("user", { id: result.userId }) ?? null;
        }
        continue;
      }
      if (relName === "parent" && tableName === "folder") {
        if (result.parentId) {
          result.parent = findUnique("folder", { id: result.parentId }) ?? null;
        }
        continue;
      }
      if (relName === "_count" && typeof relOpts === "object" && relOpts !== null) {
        const countFields = Object.keys(relOpts).filter((k) => relOpts[k] === true);
        const counts: Record<string, number> = {};
        for (const field of countFields) {
          // Resolve relation: find foreign key
          if (field === "documents" && tableName === "folder") {
            counts[field] = findMany("document", { folderId: result.id }).length;
          } else if (field === "children" && tableName === "folder") {
            counts[field] = findMany("folder", { parentId: result.id }).length;
          } else if (field === "tags" && tableName === "document") {
            counts[field] = findMany("tagDocument", { documentId: result.id }).length;
          } else if (field === "documents" && tableName === "tag") {
            counts[field] = findMany("tagDocument", { tagId: result.id }).length;
          } else if (field === "links" && tableName === "document") {
            counts[field] = findMany("shareLink", { documentId: result.id }).length;
          } else {
            counts[field] = 0;
          }
        }
        result._count = counts;
        continue;
      }
    }
    return result;
  }

  return {
    findUnique: ({
      where,
      include,
    }: {
      where: Record<string, unknown>;
      include?: Record<string, unknown>;
    }) =>
      Promise.resolve(
        populateInclude(findUnique(tableName, where) as Record<string, unknown>, include),
      ),
    findFirst: ({
      where,
      include,
    }: {
      where?: Record<string, unknown>;
      include?: Record<string, unknown>;
    }) => {
      const first = findMany(tableName, where)[0] ?? null;
      return Promise.resolve(first ? populateInclude(first, include) : null);
    },
    findMany: ({
      where,
      orderBy,
      skip,
      take,
      include,
      select,
      ...rest
    }: Record<string, unknown> = {}) => {
      let results = findMany(tableName, where as Record<string, unknown>);
      if (typeof skip === "number") results = results.slice(skip);
      if (typeof take === "number") results = results.slice(0, take);
      if (include)
        results = results.map((r) => populateInclude(r, include as Record<string, unknown>));
      return Promise.resolve(results);
    },
    create: ({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve(create(tableName, data)),
    createMany: ({ data }: { data: Record<string, unknown>[] }) =>
      Promise.resolve({ count: createMany(tableName, data) }),
    update: ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) =>
      Promise.resolve(update(tableName, where, data)),
    updateMany: ({
      where,
      data,
    }: {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    }) => Promise.resolve({ count: updateMany(tableName, where, data) }),
    upsert: async ({
      where,
      create: c,
      update: u,
    }: {
      where: Record<string, unknown>;
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }) => {
      const existing = findUnique(tableName, where);
      if (existing) return update(tableName, where, u);
      return create(tableName, c);
    },
    delete: ({ where }: { where: Record<string, unknown> }) => {
      const record = findUnique(tableName, where);
      if (record) deleteMany(tableName, where);
      return Promise.resolve(record ?? {});
    },
    deleteMany: ({ where }: { where?: Record<string, unknown> }) =>
      Promise.resolve({ count: deleteMany(tableName, where) }),
    count: ({ where }: { where?: Record<string, unknown> } = {}) =>
      Promise.resolve(count(tableName, where)),
    groupBy: () => Promise.resolve([]),
    aggregate: () =>
      Promise.resolve({ _count: 0, _sum: null, _avg: null, _min: null, _max: { order: null } }),
  };
}

// Handle WITH RECURSIVE CTE queries for folder tree operations
function handleRecursiveCTE(sql: string, sqlLower: string, params: unknown[]): unknown[] {
  // getDescendantIds pattern: SELECT id FROM descendants (returns { id: string }[])
  if (sqlLower.includes("select id from descendants")) {
    const folderId = params[0] as string;
    const userId = params[1] as string;
    // BFS walk down the tree: find all children recursively
    const result: { id: string }[] = [];
    const queue: string[] = [folderId];
    const visited = new Set<string>();
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);
      const folder = findUnique("folder", { id: currentId });
      if (folder && folder.userId === userId && (folder.deletedAt ?? null) === null) {
        result.push({ id: folder.id as string });
        // Find children (folders where parentId === currentId)
        const children = findMany("folder", {}).filter(
          (f) => f.parentId === currentId && f.userId === userId && (f.deletedAt ?? null) === null,
        );
        for (const child of children) {
          queue.push(child.id as string);
        }
      }
    }
    return result;
  }
  // getAncestorDepth pattern: SELECT MAX(depth) AS depth FROM ancestors
  if (sqlLower.includes("select max(depth)")) {
    return [{ depth: BigInt(0) }];
  }
  return [{ "?column?": 1 }];
}

// Build the mock prisma client as a plain object with model properties
// Smart $queryRawUnsafe that queries the in-memory store based on SQL patterns
function smartQueryRawUnsafe(sql: string, ...params: unknown[]): unknown[] {
  const sqlLower = sql.toLowerCase();

  // WITH RECURSIVE CTE queries (getDescendantIds, getAncestorDepth)
  if (sqlLower.includes("with recursive")) {
    return handleRecursiveCTE(sql, sqlLower, params);
  }

  // COUNT(*) queries — return total from matching rows
  if (sqlLower.includes("select count(*)")) {
    const tableName = sqlLower.includes("from documents")
      ? "document"
      : sqlLower.includes("from folders")
        ? "folder"
        : sqlLower.includes("from tags") || sqlLower.includes("from tags t")
          ? "tag"
          : null;
    if (tableName) {
      const rows = filterStoreRows(tableName, sqlLower, params);
      return [{ total: BigInt(rows.length) }];
    }
    return [{ total: BigInt(0) }];
  }

  // SELECT DISTINCT ... as text (suggestion queries)
  if (sqlLower.includes("as text") && sqlLower.includes("as type")) {
    if (sqlLower.includes("from folders")) {
      const userId = params[0] as string;
      const queryParam = ((params[1] as string) || "").replace(/%/g, "").toLowerCase();
      const folders = findMany("folder", { userId, deletedAt: null });
      const matches = folders.filter((f) => {
        const name = String(f.name ?? "").toLowerCase();
        return name.includes(queryParam);
      });
      // Dedupe by name
      const seen = new Set<string>();
      return matches
        .filter((f) => {
          const name = String(f.name ?? "");
          if (seen.has(name.toLowerCase())) return false;
          seen.add(name.toLowerCase());
          return true;
        })
        .map((f) => ({ text: f.name, type: "folder", count: BigInt(1) }));
    }
    if (sqlLower.includes("from tags")) {
      const userId = params[0] as string;
      const queryParam = ((params[1] as string) || "").replace(/%/g, "").toLowerCase();
      const tags = findMany("tag", { userId });
      const matches = tags.filter((t) => {
        const name = String(t.name ?? "").toLowerCase();
        return name.includes(queryParam);
      });
      return matches.map((t) => ({
        text: t.name,
        type: "tag",
        count: BigInt(findMany("tagDocument", { tagId: t.id }).length),
        id: t.id,
      }));
    }
    if (sqlLower.includes("from documents")) {
      const userId = params[0] as string;
      const queryParam = ((params[1] as string) || "").replace(/%/g, "").toLowerCase();
      const docs = findMany("document", { userId, deletedAt: null });
      const matches = docs.filter((d) => {
        const title = String(d.title ?? "").toLowerCase();
        return title.includes(queryParam);
      });
      const seen = new Set<string>();
      return matches
        .filter((d) => {
          const title = String(d.title ?? "");
          if (seen.has(title.toLowerCase())) return false;
          seen.add(title.toLowerCase());
          return true;
        })
        .map((d) => ({ text: d.title, type: "title", count: BigInt(1) }));
    }
  }

  // SELECT d.id, d.title ... FROM documents (search queries)
  if (sqlLower.includes("from documents") && sqlLower.includes("d.id")) {
    const rows = filterStoreRows("document", sqlLower, params);
    // Extract folder names by joining with folder store
    return rows.map((r) => {
      const folder = r.folderId ? findUnique("folder", { id: r.folderId as string }) : null;
      return {
        id: r.id,
        title: r.title,
        fileName: r.fileName,
        status: r.status,
        pageCount: r.pageCount,
        fileSize: r.fileSize,
        outputFormats: r.outputFormats,
        createdAt: r.createdAt,
        folderId: r.folderId,
        searchpreview: r.searchpreview,
        wordcount: r.wordcount,
        rank: 0.5,
        folderName: folder?.name ?? null,
      };
    });
  }

  return [{ "?column?": 1 }];
}

// Filter store rows based on SQL WHERE patterns and params
function filterStoreRows(
  tableName: string,
  sqlLower: string,
  params: unknown[],
): Record<string, unknown>[] {
  const table = getTable(tableName);
  let rows = Array.from(table.values());

  // Filter by deletedAt IS NULL
  if (sqlLower.includes('deletedat" is null') || sqlLower.includes("deletedat is null")) {
    rows = rows.filter((r) => (r.deletedAt ?? null) === null);
  }

  // Filter by userId = $N
  const userIdMatch = sqlLower.match(/"userid"\s*=\s*\$(\d+)/);
  if (userIdMatch) {
    const paramIdx = parseInt(userIdMatch[1]) - 1;
    const userId = params[paramIdx] as string;
    rows = rows.filter((r) => r.userId === userId);
  }

  // Filter by t."userId" = $N (for tags with alias)
  const tUserIdMatch = sqlLower.match(/t\."userid"\s*=\s*\$(\d+)/);
  if (tUserIdMatch) {
    const paramIdx = parseInt(tUserIdMatch[1]) - 1;
    const userId = params[paramIdx] as string;
    rows = rows.filter((r) => r.userId === userId);
  }

  // Filter by folder name ILIKE (for type=folder search)
  const folderNameMatch = sqlLower.match(/f\.name\s+ilike\s+\$(\d+)/);
  if (folderNameMatch) {
    const paramIdx = parseInt(folderNameMatch[1]) - 1;
    const searchTerm = String(params[paramIdx] ?? "")
      .replace(/%/g, "")
      .toLowerCase();
    if (searchTerm.length >= 2) {
      // Filter documents whose folder's name contains the search term
      rows = rows.filter((r) => {
        if (!r.folderId) return false;
        const folder = findUnique("folder", { id: r.folderId as string });
        const folderName = String(folder?.name ?? "").toLowerCase();
        return folderName.includes(searchTerm);
      });
    }
  }

  // Simple ILIKE filter on title/searchpreview — only if no folder name filter applied
  if (!folderNameMatch) {
    const stringParams = params.filter((p) => typeof p === "string" && p !== "") as string[];
    const userIds = new Set(
      stringParams.filter((p) => p.startsWith("test_") || p.startsWith("clx")),
    );

    for (const param of stringParams) {
      if (userIds.has(param)) continue;
      const searchTerm = param.replace(/%/g, "").toLowerCase();
      if (searchTerm.length < 2) continue;
      rows = rows.filter((r) => {
        const title = String(r.title ?? "").toLowerCase();
        const preview = String(r.searchpreview ?? "").toLowerCase();
        const name = String(r.name ?? "").toLowerCase();
        return (
          title.includes(searchTerm) || preview.includes(searchTerm) || name.includes(searchTerm)
        );
      });
      break; // Only apply the first search term
    }
  }

  // Filter by folderId = $N
  const folderIdMatch = sqlLower.match(/"folderid"\s*=\s*\$(\d+)/);
  if (folderIdMatch) {
    const paramIdx = parseInt(folderIdMatch[1]) - 1;
    const folderId = params[paramIdx] as string;
    rows = rows.filter((r) => r.folderId === folderId);
  }

  // Filter by status = $N
  const statusMatch = sqlLower.match(/\bstatus\s*=\s*\$(\d+)/);
  if (statusMatch) {
    const paramIdx = parseInt(statusMatch[1]) - 1;
    const status = params[paramIdx] as string;
    rows = rows.filter((r) => r.status === status);
  }

  // LIMIT and OFFSET — last two params are usually limit, offset
  const lastTwoParams = params.slice(-2);
  if (
    lastTwoParams.length === 2 &&
    typeof lastTwoParams[0] === "number" &&
    typeof lastTwoParams[1] === "number"
  ) {
    const limit = lastTwoParams[0] as number;
    const offset = lastTwoParams[1] as number;
    rows = rows.slice(offset, offset + limit);
  }

  return rows;
}

const mockPrismaObj: Record<string, unknown> = {
  _store: store,
  $queryRaw: (firstArg: unknown, ...rest: unknown[]) => {
    // Handle Prisma.sql tagged template → { strings: string[], values: unknown[] }
    if (firstArg && typeof firstArg === "object" && "strings" in firstArg && "values" in firstArg) {
      const sqlObj = firstArg as { strings: string[]; values: unknown[] };
      // Rebuild positional SQL as $1, $2... for smartQueryRawUnsafe
      const sql = sqlObj.strings.reduce((acc, str, i) => {
        return acc + str + (i < sqlObj.values.length ? `$${i + 1}` : "");
      }, "");
      return Promise.resolve(smartQueryRawUnsafe(sql, ...sqlObj.values));
    }
    // Fallback for template literal syntax
    if (typeof firstArg === "object" && firstArg !== null && "join" in firstArg) {
      const strings = firstArg as TemplateStringsArray;
      return Promise.resolve(smartQueryRawUnsafe(strings.join(""), ...rest));
    }
    if (typeof firstArg === "string") {
      return Promise.resolve(smartQueryRawUnsafe(firstArg, ...rest));
    }
    return Promise.resolve([{ "?column?": 1 }]);
  },
  $queryRawUnsafe: (sql: string, ...params: unknown[]) =>
    Promise.resolve(smartQueryRawUnsafe(sql, ...params)),
  $executeRaw: () => Promise.resolve(0),
  $executeRawUnsafe: () => Promise.resolve({ count: 0 }),
  $transaction: (fnOrFns: unknown) => {
    if (typeof fnOrFns === "function") {
      // Prisma passes a tx client — our mock uses the same proxy since it's in-memory
      return fnOrFns(mockPrismaObj);
    }
    if (Array.isArray(fnOrFns)) {
      return Promise.all(fnOrFns.map((fn: () => Promise<unknown>) => fn()));
    }
    return Promise.resolve();
  },
  $connect: () => Promise.resolve(),
  $disconnect: () => Promise.resolve(),
};

// Add model proxies
for (const [modelName, tableName] of Object.entries(tableMap)) {
  mockPrismaObj[modelName] = createModelProxy(tableName);
}

export const mockPrisma = mockPrismaObj;

// Reset store between tests
export function resetStore() {
  store.clear();
}
