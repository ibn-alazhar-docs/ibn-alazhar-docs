import { vi } from "vitest";

/**
 * The one `next/server` stand-in for the whole suite. `tests/setup.ts` registers
 * it through `vi.mock`, so every project shares it — an earlier inline copy in
 * that file had drifted from this one (dropped headers, no binary bodies), and
 * route tests silently could not assert what a real `Response` exposes.
 *
 * Bodies reach the test as strings, objects, or `Uint8Array` (file downloads),
 * so decoding mirrors `Response` closely enough for `text()`/`json()`
 * assertions to mean the same thing they would against the real thing.
 */
function decodeBody(body: unknown): string {
  if (typeof body === "string") return body;
  if (body instanceof Uint8Array) return new TextDecoder().decode(body);
  if (body === undefined || body === null) return "";
  return JSON.stringify(body);
}

function parseBody<T = unknown>(body: unknown): T {
  if (body !== null && typeof body === "object") return body as T;
  const text = decodeBody(body);
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

/**
 * `new Headers({ ...someHeaders })` looks harmless but silently produces an
 * empty set: object spread copies own enumerable properties, and a `Headers`
 * instance has none. Routes that pass a built `Headers` (e.g. a route's
 * `Retry-After`) therefore lost every custom header under this mock.
 */
function mergeHeaders(init?: any): Headers {
  const headers = new Headers();
  headers.set("content-type", "application/json");
  const provided = init?.headers;
  if (provided instanceof Headers) {
    provided.forEach((value, key) => headers.set(key, value));
  } else if (provided) {
    for (const [key, value] of new Headers(provided)) headers.set(key, value);
  }
  return headers;
}

export class NextResponse {
  status: number;
  headers: Headers;
  body: any;
  cookies: {
    set: (key: string, val: string, opt?: any) => void;
    get: (key: string) => any;
    _store: Map<string, any>;
  };
  constructor(body?: any, init?: any) {
    this.body = body;
    this.status = init?.status ?? 200;
    this.headers = mergeHeaders(init);
    this.cookies = {
      _store: new Map(),
      set: function (key, val, opt) {
        this._store.set(key, { value: val, options: opt });
      },
      get: function (key) {
        return this._store.get(key);
      },
    };
  }
  async json() {
    return parseBody(this.body);
  }
  async text() {
    return decodeBody(this.body);
  }
  // Spies, not plain methods: tests assert on how a route called
  // `NextResponse.json` (status, init, payload) via `mock.calls`.
  static json = vi.fn((data: unknown, init?: any) => new NextResponse(data, init));
  static redirect = vi.fn((url: string) => {
    const response = new NextResponse(null, { status: 302 });
    response.headers.set("Location", url);
    return response;
  });
}
