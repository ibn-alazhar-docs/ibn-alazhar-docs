export function createApiRequest(path: string, options: RequestInit = {}) {
  const url = new URL(path, "http://localhost");
  return new Request(url.toString(), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
}
