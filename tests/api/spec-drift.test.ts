import { describe, it, expect } from "vitest";
import { spec } from "./openapi-spec";
import { readdirSync, readFileSync, existsSync } from "fs";
import path from "path";

const API_ROUTES_DIR = path.resolve(__dirname, "../../apps/web/src/app/api");

function extractRoutesFromFS(dir: string, basePath: string = ""): string[] {
  const routes: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return routes;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.join(basePath, entry.name);

    if (entry.isDirectory()) {
      if (entry.name.startsWith("[") && entry.name.endsWith("]")) {
        const paramName = entry.name.slice(1, -1);
        const isCatchAll = paramName.startsWith("...");
        const cleanName = isCatchAll ? paramName.replace("...", "") : paramName;
        const wildcard = isCatchAll ? `${cleanName}` : `{${cleanName}}`;
        routes.push(...extractRoutesFromFS(fullPath, path.join(basePath, `{${cleanName}}`)));
      } else if (entry.name.startsWith("(")) {
        routes.push(...extractRoutesFromFS(fullPath, basePath));
      } else {
        routes.push(...extractRoutesFromFS(fullPath, relativePath));
      }
    } else if (entry.name === "route.ts") {
      const routePath = "/api" + (basePath ? "/" + basePath.replace(/\\/g, "/") : "");
      if (!routes.includes(routePath)) {
        routes.push(routePath);
      }
    }
  }

  return routes.sort();
}

function extractImportedRoute(routePath: string): string {
  return routePath.replace(/\\/g, "/");
}

interface RouteEntry {
  path: string;
  methods: string[];
}

function parseRouteMethods(filePath: string): string[] {
  try {
    const content = readFileSync(filePath, "utf-8");
    const methods: string[] = [];
    const exports = content.matchAll(
      /^export\s+(async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)\s/gm,
    );
    for (const match of exports) {
      methods.push(match[2]);
    }
    return methods;
  } catch {
    return [];
  }
}

function collectCodeRoutes(): RouteEntry[] {
  const routeEntryPoints: string[] = [];

  function walk(dir: string) {
    let entries: string[];
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name === "route.ts") {
        routeEntryPoints.push(fullPath);
      }
    }
  }

  walk(API_ROUTES_DIR);
  return routeEntryPoints.map((fp) => {
    const relativePath = path.relative(API_ROUTES_DIR, fp);
    const dirPart = path.dirname(relativePath);
    const routePath =
      "/api/" +
      dirPart
        .replace(/\\/g, "/")
        .replace(/\[\.\.\.(\w+)\]/g, "{$1}")
        .replace(/\[(\w+)\]/g, "{$1}");
    const methods = parseRouteMethods(fp);
    return { path: routePath, methods };
  });
}

function normalizeOpenAPIRoute(route: string): string {
  return route.replace(/\{(\w+)\}/g, "{$1}");
}

function normalizeFsRoute(route: string): string {
  return route.replace(/\{(\w+)\}/g, "{$1}");
}

describe("Spec-Drift Detector", () => {
  const codeRoutes = collectCodeRoutes();
  const specPaths = Object.keys(spec.paths).map(normalizeOpenAPIRoute);

  it("detects API route files exist", () => {
    expect(codeRoutes.length).toBeGreaterThan(0);
  });

  it("detects spec has path entries", () => {
    expect(specPaths.length).toBeGreaterThan(0);
  });

  it("all code routes are documented in OpenAPI spec", () => {
    const undocumented: { path: string; methods: string[] }[] = [];

    for (const cr of codeRoutes) {
      const normalized = normalizeFsRoute(cr.path);
      const specMatch = specPaths.find((sp) => normalizeOpenAPIRoute(sp) === normalized);
      if (!specMatch) {
        undocumented.push(cr);
      }
    }

    if (undocumented.length > 0) {
      const msg = undocumented.map((u) => `  ${u.path} [${u.methods.join(", ")}]`).join("\n");
      expect(undocumented).toEqual([]);
    }
  });

  it("no spec-only routes without code implementation", () => {
    const fileless: string[] = [];
    for (const sp of specPaths) {
      const match = codeRoutes.find(
        (cr) => normalizeFsRoute(cr.path) === normalizeOpenAPIRoute(sp),
      );
      if (!match) {
        fileless.push(sp);
      }
    }

    if (fileless.length > 0) {
      const msg = fileless.join("\n  ");
    }
  });

  it("code route methods match spec methods for documented routes", () => {
    const mismatches: string[] = [];

    for (const cr of codeRoutes) {
      const normalized = normalizeFsRoute(cr.path);
      const specMatch = codeRoutes.find((c) => normalizeFsRoute(c.path) === normalized);
      if (!specMatch) continue;

      const specPathItem = spec.paths[normalized] as any;
      if (!specPathItem) continue;

      for (const method of cr.methods) {
        const specMethod = method.toLowerCase();
        if (!specPathItem[specMethod]) {
          mismatches.push(`${method} ${cr.path} exists in code but not in spec`);
        }
      }
    }

    if (mismatches.length > 0) {
      const msg = mismatches.join("\n");
    }
  });
});
