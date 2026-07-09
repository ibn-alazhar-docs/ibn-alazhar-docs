import { vi } from "vitest";

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
    this.headers = new Headers(init?.headers);
    this.cookies = {
      _store: new Map(),
      set: function(key, val, opt) { this._store.set(key, {value: val, options: opt}); },
      get: function(key) { return this._store.get(key); }
    };
  }
  async json() {
    if (typeof this.body === "string") {
      try { return JSON.parse(this.body); } catch (e) { return this.body; }
    }
    return this.body;
  }
  async text() {
    return typeof this.body === "string" ? this.body : JSON.stringify(this.body);
  }
  static json(data: unknown, init?: any) {
    return {
      status: init?.status ?? 200,
      headers: new Headers({ "content-type": "application/json", ...init?.headers }),
      json: () => Promise.resolve(data),
      cookies: {
        _store: new Map(),
        set: function(key: string, val: string, opt?: any) { this._store.set(key, {value: val, options: opt}); },
        get: function(key: string) { return this._store.get(key); }
      }
    };
  }
  static redirect(url: string) {
    return {
      status: 302,
      headers: new Headers({ Location: url }),
      cookies: {
        _store: new Map(),
        set: function(key: string, val: string, opt?: any) { this._store.set(key, {value: val, options: opt}); },
        get: function(key: string) { return this._store.get(key); }
      }
    };
  }
}
