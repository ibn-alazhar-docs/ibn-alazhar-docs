"use client";

/**
 * API Client مركزي — Ibn Al-Azhar Docs
 * يوفر error handling موحد وauth headers تلقائي
 */

interface RequestOptions extends Omit<RequestInit, "method" | "body"> {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  params?: Record<string, string>;
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

  // 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

/**
 * طلب API مركزي
 * @example
 * const data = await apiClient.get<Tag[]>("/api/tags");
 * const doc = await apiClient.post<Document>("/api/documents", { title: "..." });
 */
export const apiClient = {
  async get<T>(path: string, options?: RequestOptions): Promise<T> {
    const url = buildUrl(path, options?.params);
    const { params: _params, ...fetchOptions } = options ?? {};
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...fetchOptions.headers,
      },
      ...fetchOptions,
    });
    return handleResponse<T>(response);
  },

  async post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    const url = buildUrl(path, options?.params);
    const { params: _params, ...fetchOptions } = options ?? {};
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...fetchOptions.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      ...fetchOptions,
    });
    return handleResponse<T>(response);
  },

  async put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    const url = buildUrl(path, options?.params);
    const { params: _params, ...fetchOptions } = options ?? {};
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...fetchOptions.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      ...fetchOptions,
    });
    return handleResponse<T>(response);
  },

  async patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    const url = buildUrl(path, options?.params);
    const { params: _params, ...fetchOptions } = options ?? {};
    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...fetchOptions.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      ...fetchOptions,
    });
    return handleResponse<T>(response);
  },

  async delete<T>(path: string, options?: RequestOptions): Promise<T> {
    const url = buildUrl(path, options?.params);
    const { params: _params, ...fetchOptions } = options ?? {};
    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...fetchOptions.headers,
      },
      ...fetchOptions,
    });
    return handleResponse<T>(response);
  },
};
