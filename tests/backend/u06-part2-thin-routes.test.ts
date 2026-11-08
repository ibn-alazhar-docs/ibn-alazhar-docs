import { describe, expect, it } from "vitest";
import { formatPrometheusLine } from "@/core/services/metrics.use-cases";
import { TASHKEEL_MAX_TEXT_LENGTH } from "@/core/services/tashkeel.use-cases";

describe("U06-part2 thin-route core helpers (parity)", () => {
  it("formats prometheus lines exactly as the route did", () => {
    expect(formatPrometheusLine("ibn_db_users_total", 3, "Total active users")).toBe(
      "# HELP ibn_db_users_total Total active users\n# TYPE ibn_db_users_total gauge\nibn_db_users_total 3",
    );
    expect(formatPrometheusLine("up", 1, "Application is up", "counter")).toBe(
      "# HELP up Application is up\n# TYPE up counter\nup 1",
    );
  });

  it("keeps the tashkeel length limit at 20,000 characters", () => {
    expect(TASHKEEL_MAX_TEXT_LENGTH).toBe(20_000);
    expect("x".repeat(20_001).length > TASHKEEL_MAX_TEXT_LENGTH).toBe(true);
  });
});
