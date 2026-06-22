import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/health/route";
import { createApiRequest } from "./helpers";

describe("Health API", () => {
  it("returns 200 OK", async () => {
    const req = createApiRequest("/api/health");
    const res = await GET(req);
    
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("healthy");
  });
});
