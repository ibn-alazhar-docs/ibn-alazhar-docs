import "dotenv/config";
import { vi, beforeAll, afterAll } from "vitest";

beforeAll(() => {
  vi.setConfig({ testTimeout: 60000 });
});

afterAll(async () => {
  vi.restoreAllMocks();
});
