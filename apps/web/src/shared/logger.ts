import pino from "pino";

const isDev = process.env.NODE_ENV === "development";
const isTest = process.env.NODE_ENV === "test";

export const logger = pino({
  level: process.env.LOG_LEVEL || (isTest ? "silent" : isDev ? "debug" : "info"),
  transport:
    isDev && !process.env.NEXT_RUNTIME
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined,
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export function generateRequestId(): string {
  return crypto.randomUUID();
}
