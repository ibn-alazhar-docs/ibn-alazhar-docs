const isDev = process.env.NODE_ENV !== "production";

function formatMessage(level: string, module: string, msg: string): string {
  return `[${level}] [${module}] ${msg}`;
}

export const logger = {
  debug: (module: string, msg: string, ...args: unknown[]) => {
    if (isDev) console.debug(formatMessage("debug", module, msg), ...args);
  },
  info: (module: string, msg: string, ...args: unknown[]) => {
    console.info(formatMessage("info", module, msg), ...args);
  },
  warn: (module: string, msg: string, ...args: unknown[]) => {
    console.warn(formatMessage("warn", module, msg), ...args);
  },
  error: (module: string, msg: string, ...args: unknown[]) => {
    console.error(formatMessage("error", module, msg), ...args);
  },
};
