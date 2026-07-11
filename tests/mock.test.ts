import { test, vi } from "vitest";

test("mock behavior", async () => {
  const myMock = vi.fn();
  myMock.mockRejectedValue(new Error("Always fails"));
  myMock.mockImplementation(() => "Works!");

  try {
    const res = await myMock();
    console.log("SUCCESS", res);
  } catch (e: any) {
    console.log("ERROR", e.message);
  }
});
