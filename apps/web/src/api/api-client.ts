"use client";

/**
 * API Client — Ibn Al-Azhar Docs
 * Centralized error handling + automatic auth headers
 */

interface RequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, string>;
  signal?: AbortSignal;
}

interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

export class ApiClientError extends Error {
  code?: string;
  status?: number;

  constructor(error: ApiError) {
    super(error.message);
    this.name = "ApiClientError";
    this.code = error.code;
    this.status = error.status;
  }
}

function buildUrl(path: string, params?: Record<string, string>): string {
  const url = new URL(path, window.location.origin);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new ApiClientError({
      message: data?.error?.message ?? data?.message ?? `HTTP ${response.status}`,
      code: data?.error?.code,
      status: response.status,
    });
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

function buildHeaders(contentType: string, extra?: Record<string, string>): Record<string, string> {
  return { "Content-Type": contentType, ...extra };
}

// Read the non-httpOnly csrf_token cookie so we can echo it on mutating requests.
function getCsrfToken(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
  return match?.[1];
}

// Headers for state-changing requests: inject X-CSRF-Token when a cookie exists.
function mutatingHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = getCsrfToken();
  return buildHeaders("application/json", {
    ...(token ? { "X-CSRF-Token": token } : {}),
    ...extra,
  });
}

/**
 * Centralized API client
 * @example
 * const data = await apiClient.get<Tag[]>("/api/tags");
 * const doc = await apiClient.post<Document>("/api/documents", { title: "..." });
 */
export const apiClient = {
  async get<T>(path: string, options?: RequestOptions): Promise<T> {
    const url = buildUrl(path, options?.params);
    const response = await fetch(url, {
      method: "GET",
      headers: buildHeaders("application/json", options?.headers),
      signal: options?.signal,
    });
    return handleResponse<T>(response);
  },

  async post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    const url = buildUrl(path, options?.params);
    const response = await fetch(url, {
      method: "POST",
      headers: mutatingHeaders(options?.headers),
      body: body != null ? JSON.stringify(body) : undefined,
      signal: options?.signal,
    });
    return handleResponse<T>(response);
  },

  async put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    const url = buildUrl(path, options?.params);
    const response = await fetch(url, {
      method: "PUT",
      headers: mutatingHeaders(options?.headers),
      body: body != null ? JSON.stringify(body) : undefined,
      signal: options?.signal,
    });
    return handleResponse<T>(response);
  },

  async patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    const url = buildUrl(path, options?.params);
    const response = await fetch(url, {
      method: "PATCH",
      headers: mutatingHeaders(options?.headers),
      body: body != null ? JSON.stringify(body) : undefined,
      signal: options?.signal,
    });
    return handleResponse<T>(response);
  },

  async delete<T>(path: string, options?: RequestOptions): Promise<T> {
    const url = buildUrl(path, options?.params);
    const response = await fetch(url, {
      method: "DELETE",
      headers: mutatingHeaders(options?.headers),
      signal: options?.signal,
    });
    return handleResponse<T>(response);
  },
};
