export function getCsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )csrf_token=([^;]+)"));
  return match ? (match[2] ?? null) : null;
}

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  const token = getCsrfToken();
  if (token && !headers.has("X-CSRF-Token")) {
    headers.set("X-CSRF-Token", token);
  }

  return fetch(input, {
    ...init,
    headers,
  });
}
