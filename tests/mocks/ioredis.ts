import { vi } from "vitest";

const keyState = new Map<string, { count: number }>();

function statefulSet(key: string, value: string, ...extra: any[]) {
  const isNX = extra.includes("NX");
  if (isNX) {
    if (keyState.has(key)) return null;
    keyState.set(key, { count: Number(value) });
    return "OK";
  }
  keyState.set(key, { count: Number(value) || 1 });
  return "OK";
}

function statefulIncr(key: string) {
  const state = keyState.get(key) ?? { count: 0 };
  state.count++;
  keyState.set(key, state);
  return state.count;
}

export const mockInstance: Record<string, any> = {
  set: vi.fn(statefulSet),
  incr: vi.fn(statefulIncr),
  expire: vi.fn<any>().mockResolvedValue(1),
  ttl: vi.fn<any>().mockResolvedValue(60),
  on: vi.fn<any>().mockReturnThis(),
  ping: vi.fn<any>().mockResolvedValue("PONG"),
  get: vi.fn<any>(),
  del: vi.fn(async (key: string) => {
    keyState.delete(key);
    return 1;
  }),
  quit: vi.fn<any>().mockResolvedValue(undefined),
  disconnect: vi.fn<any>().mockResolvedValue(undefined),
  __resetState: () => keyState.clear(),
  __restoreStateful: () => {
    mockInstance.set.mockImplementation(statefulSet);
    mockInstance.incr.mockImplementation(statefulIncr);
    mockInstance.expire.mockReset();
    mockInstance.expire.mockResolvedValue(1);
    mockInstance.ttl.mockReset();
    mockInstance.ttl.mockResolvedValue(60);
    mockInstance.on.mockReset();
    mockInstance.on.mockReturnThis();
    mockInstance.get.mockReset();
    mockInstance.quit.mockReset();
    mockInstance.quit.mockResolvedValue(undefined);
    mockInstance.disconnect.mockReset();
    mockInstance.disconnect.mockResolvedValue(undefined);
    mockInstance.del.mockImplementation(async (key: string) => {
      keyState.delete(key);
      return 1;
    });
  },
};

export function __setCreateClient(v: boolean) {
  process.env.__IODIS_MOCK_CREATE_CLIENT = v ? "1" : "0";
}

export default vi.fn(() => {
  const shouldCreate = process.env.__IODIS_MOCK_CREATE_CLIENT !== "0";
  if (!shouldCreate) return null;
  return { ...mockInstance };
}) as any;
