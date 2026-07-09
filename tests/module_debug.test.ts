import { test, vi } from "vitest";
vi.mock("ioredis", () => import("./mocks/ioredis"));

import { checkRedisRateLimit, getRedisClient, redisFailed } from "@/clients/redis/rate-limit/redis";

test("debug checkRedisRateLimit", async () => {
  const redis = await getRedisClient();
  console.log("redis is truthy?", !!redis);
  console.log("redisFailed?", redisFailed);
  
  for (let i = 0; i < 21; i++) {
    const r = await checkRedisRateLimit("test-key", 20, 60000);
    console.log(`i=${i} r=${JSON.stringify(r)}`);
  }
});
