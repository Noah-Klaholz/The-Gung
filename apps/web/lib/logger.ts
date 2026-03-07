export type LogLevel = "debug" | "info" | "warn" | "error";

const levelOrder: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

class Logger {
  private minLevel: LogLevel = process.env.NODE_ENV === "production" ? "info" : "debug";

  setLevel(level: LogLevel) {
    this.minLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return levelOrder[level] >= levelOrder[this.minLevel];
  }

  private format(scope: string, level: LogLevel, message: string) {
    return `[${new Date().toISOString()}] [${level.toUpperCase()}] [${scope}] ${message}`;
  }

  debug(scope: string, message: string, ...meta: unknown[]) {
    if (this.shouldLog("debug")) console.debug(this.format(scope, "debug", message), ...meta);
  }

  info(scope: string, message: string, ...meta: unknown[]) {
    if (this.shouldLog("info")) console.info(this.format(scope, "info", message), ...meta);
  }

  warn(scope: string, message: string, ...meta: unknown[]) {
    if (this.shouldLog("warn")) console.warn(this.format(scope, "warn", message), ...meta);
  }

  error(scope: string, message: string, ...meta: unknown[]) {
    if (this.shouldLog("error")) console.error(this.format(scope, "error", message), ...meta);
  }
}

export const logger = new Logger();

export function createLogger(scope: string) {
  return {
    debug: (msg: string, ...meta: unknown[]) => logger.debug(scope, msg, ...meta),
    info: (msg: string, ...meta: unknown[]) => logger.info(scope, msg, ...meta),
    warn: (msg: string, ...meta: unknown[]) => logger.warn(scope, msg, ...meta),
    error: (msg: string, ...meta: unknown[]) => logger.error(scope, msg, ...meta),
  };
}