import "dotenv/config";
import { vi, beforeAll, afterAll } from "vitest";

// The integration pool runs with singleFork:true, so process.env is shared
// across test files. Files that set QUEUE_DRIVER="pg" at module scope (the
// pg-* suite) would otherwise leak it into later files — dotenv/config does
// not overwrite an already-set variable, so the leak is sticky until process
// exit. Snapshot the value loaded from .env exactly once (setup runs before
// each test file's module code) and restore it after every file.
const g = globalThis as typeof globalThis & {
  __integrationSavedQueueDriver?: string;
  __integrationQueueDriverSnapshotTaken?: boolean;
};
if (!g.__integrationQueueDriverSnapshotTaken) {
  g.__integrationSavedQueueDriver = process.env.QUEUE_DRIVER;
  g.__integrationQueueDriverSnapshotTaken = true;
}

beforeAll(() => {
  vi.setConfig({ testTimeout: 60000 });
});

afterAll(async () => {
  if (g.__integrationSavedQueueDriver === undefined) {
    delete process.env.QUEUE_DRIVER;
  } else {
    process.env.QUEUE_DRIVER = g.__integrationSavedQueueDriver;
  }
  vi.restoreAllMocks();
});
