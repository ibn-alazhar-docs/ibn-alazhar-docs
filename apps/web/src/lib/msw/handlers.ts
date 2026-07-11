import { http, HttpResponse } from "msw";

const API_BASE = "/api";

export const handlers = [
  http.get(`${API_BASE}/health`, () => {
    return HttpResponse.json({ status: "ok", timestamp: new Date().toISOString() });
  }),

  http.get(`${API_BASE}/documents`, ({ request }: { request: Request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page") || "1");
    const limit = Number(url.searchParams.get("limit") || "10");
    return HttpResponse.json({
      documents: [],
      pagination: { page, limit, total: 0, totalPages: 0 },
    });
  }),

  http.get(`${API_BASE}/documents/:id`, ({ params }: { params: { id: string } }) => {
    return HttpResponse.json({
      id: params.id,
      title: "Mock Document",
      content: "Mock content for testing",
      createdAt: new Date().toISOString(),
    });
  }),

  http.post(`${API_BASE}/documents`, async ({ request }: { request: Request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(
      { id: "mock-id", ...body, createdAt: new Date().toISOString() },
      { status: 201 },
    );
  }),

  http.put(
    `${API_BASE}/documents/:id`,
    async ({ request, params }: { request: Request; params: { id: string } }) => {
      const body = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json({
        id: params.id,
        ...body,
        updatedAt: new Date().toISOString(),
      });
    },
  ),

  http.delete(`${API_BASE}/documents/:id`, () => {
    return HttpResponse.json({ success: true });
  }),

  http.get(`${API_BASE}/tags`, () => {
    return HttpResponse.json({ tags: [] });
  }),

  http.post(`${API_BASE}/tags`, async ({ request }: { request: Request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(
      { id: "tag-mock-id", ...body, createdAt: new Date().toISOString() },
      { status: 201 },
    );
  }),

  http.get(`${API_BASE}/documents/:id/tags`, ({ params }: { params: { id: string } }) => {
    return HttpResponse.json({ documentId: params.id, tags: [] });
  }),

  http.post(
    `${API_BASE}/documents/:id/tags`,
    async ({ request, params }: { request: Request; params: { id: string } }) => {
      const body = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json({ documentId: params.id, ...body });
    },
  ),

  http.get(`${API_BASE}/dashboard/stats`, () => {
    return HttpResponse.json({
      totalDocuments: 0,
      totalTags: 0,
      recentActivity: [],
    });
  }),

  http.get(`${API_BASE}/dashboard/activity`, () => {
    return HttpResponse.json({ activities: [] });
  }),

  http.post(`${API_BASE}/auth/signin`, async ({ request }: { request: Request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    if (body.email === "test@example.com" && body.password === "password") {
      return HttpResponse.json({
        token: "mock-jwt-token",
        user: { id: "1", email: body.email },
      });
    }
    return HttpResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }),

  http.post(`${API_BASE}/documents/:id/suggest-tags`, () => {
    return HttpResponse.json({ suggestedTags: ["mock-tag-1", "mock-tag-2"] });
  }),
];
