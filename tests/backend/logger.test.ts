import { describe, it, expect, beforeAll } from "vitest";

// Since modules are cached by vitest, we import the logger once and test its
// runtime properties. Level-based tests verify the initial configuration.
process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "debug";

describe("logger", () => {
  let logger: import("pino").Logger;

  beforeAll(async () => {
    const mod = await import("../../packages/shared/src/logger");
    logger = mod.logger;
  });

  it("is a valid pino logger instance", () => {
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(typeof logger.error).toBe("function");
    expect(typeof logger.debug).toBe("function");
  });

  it("has the expected level set from env", () => {
    expect(logger.level).toBe("debug");
  });

  it("supports child loggers with module context", () => {
    const child = logger.child({ module: "test-module" });
    expect(typeof child.info).toBe("function");
    expect(typeof child.warn).toBe("function");
    expect(typeof child.error).toBe("function");
    expect(typeof child.debug).toBe("function");
  });

  it("child logger inherits level from parent", () => {
    const child = logger.child({ module: "test" });
    expect(child.level).toBe(logger.level);
  });

  it("can log at all levels without throwing", () => {
    expect(() => {
      logger.info("info message");
      logger.warn("warn message");
      logger.error("error message");
      logger.debug("debug message");
    }).not.toThrow();
  });

  it("can log structured objects", () => {
    expect(() => {
      logger.info({ key: "value", count: 42 }, "structured log");
    }).not.toThrow();
  });

  it("can log error objects with stack traces", () => {
    const err = new Error("test error");
    expect(() => {
      logger.error(err, "error with stack");
    }).not.toThrow();
  });

  it("can log at trace level", () => {
    expect(() => {
      logger.trace("trace message");
    }).not.toThrow();
  });

  it("can log at fatal level", () => {
    expect(() => {
      logger.fatal("fatal message");
    }).not.toThrow();
  });

  it("can log silently (level filtered by min level)", () => {
    expect(() => {
      logger.debug({ nested: { a: 1 } }, "nested object");
    }).not.toThrow();
  });
});
