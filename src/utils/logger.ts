/**
 * Logger Abstraction
 * Phase 1.2 - Injectable logger to replace direct console calls
 */

import type { ILogger } from "../types/interfaces.js";

/**
 * Log level enumeration
 */
export enum LogLevel {
  SILENT = 0,
  ERROR = 1,
  WARN = 2,
  INFO = 3,
  DEBUG = 4,
}

/**
 * Console Logger - Default implementation
 * Outputs to console with optional verbosity control
 */
export class ConsoleLogger implements ILogger {
  private verbose: boolean;
  private level: LogLevel;

  constructor(options: { verbose?: boolean; level?: LogLevel } = {}) {
    this.verbose = options.verbose ?? false;
    this.level = options.level ?? LogLevel.INFO;
  }

  log(message: string, ...args: unknown[]): void {
    if (this.level >= LogLevel.INFO) {
      console.log(message, ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.level >= LogLevel.WARN) {
      console.warn(message, ...args);
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (this.level >= LogLevel.ERROR) {
      console.error(message, ...args);
    }
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.verbose && this.level >= LogLevel.DEBUG) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  }

  setVerbose(verbose: boolean): void {
    this.verbose = verbose;
    if (verbose && this.level < LogLevel.DEBUG) {
      this.level = LogLevel.DEBUG;
    }
  }

  isVerbose(): boolean {
    return this.verbose;
  }

  /**
   * Set log level directly
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Get current log level
   */
  getLevel(): LogLevel {
    return this.level;
  }
}

/**
 * Null Logger - Silent implementation
 * Discards all log messages (useful for tests and silent mode)
 */
export class NullLogger implements ILogger {
  private verbose = false;

  log(_message: string, ..._args: unknown[]): void {
    // Intentionally empty
  }

  warn(_message: string, ..._args: unknown[]): void {
    // Intentionally empty
  }

  error(_message: string, ..._args: unknown[]): void {
    // Intentionally empty
  }

  debug(_message: string, ..._args: unknown[]): void {
    // Intentionally empty
  }

  setVerbose(verbose: boolean): void {
    this.verbose = verbose;
  }

  isVerbose(): boolean {
    return this.verbose;
  }
}

/**
 * Buffered Logger - Captures messages for later retrieval
 * Useful for testing and capturing output
 */
export class BufferedLogger implements ILogger {
  private verbose = false;
  private readonly messages: Array<{
    level: "log" | "warn" | "error" | "debug";
    message: string;
    args: unknown[];
    timestamp: Date;
  }> = [];

  log(message: string, ...args: unknown[]): void {
    this.messages.push({ level: "log", message, args, timestamp: new Date() });
  }

  warn(message: string, ...args: unknown[]): void {
    this.messages.push({ level: "warn", message, args, timestamp: new Date() });
  }

  error(message: string, ...args: unknown[]): void {
    this.messages.push({ level: "error", message, args, timestamp: new Date() });
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.verbose) {
      this.messages.push({ level: "debug", message, args, timestamp: new Date() });
    }
  }

  setVerbose(verbose: boolean): void {
    this.verbose = verbose;
  }

  isVerbose(): boolean {
    return this.verbose;
  }

  /**
   * Get all captured messages
   */
  getMessages() {
    return [...this.messages];
  }

  /**
   * Get messages filtered by level
   */
  getMessagesByLevel(level: "log" | "warn" | "error" | "debug") {
    return this.messages.filter((m) => m.level === level);
  }

  /**
   * Clear all captured messages
   */
  clear(): void {
    this.messages.length = 0;
  }

  /**
   * Check if any warnings were logged
   */
  hasWarnings(): boolean {
    return this.messages.some((m) => m.level === "warn");
  }

  /**
   * Check if any errors were logged
   */
  hasErrors(): boolean {
    return this.messages.some((m) => m.level === "error");
  }
}

/**
 * Prefixed Logger - Adds a prefix to all messages
 * Useful for identifying log sources in complex operations
 */
export class PrefixedLogger implements ILogger {
  constructor(
    private readonly prefix: string,
    private readonly inner: ILogger
  ) {}

  log(message: string, ...args: unknown[]): void {
    this.inner.log(`[${this.prefix}] ${message}`, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.inner.warn(`[${this.prefix}] ${message}`, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    this.inner.error(`[${this.prefix}] ${message}`, ...args);
  }

  debug(message: string, ...args: unknown[]): void {
    this.inner.debug(`[${this.prefix}] ${message}`, ...args);
  }

  setVerbose(verbose: boolean): void {
    this.inner.setVerbose(verbose);
  }

  isVerbose(): boolean {
    return this.inner.isVerbose();
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a logger based on options
 */
export function createLogger(options: {
  silent?: boolean;
  verbose?: boolean;
  level?: LogLevel;
  prefix?: string;
}): ILogger {
  if (options.silent) {
    return new NullLogger();
  }

  let logger: ILogger = new ConsoleLogger({
    verbose: options.verbose,
    level: options.level,
  });

  if (options.prefix) {
    logger = new PrefixedLogger(options.prefix, logger);
  }

  return logger;
}

// ============================================================================
// Default Instance (for backwards compatibility during migration)
// ============================================================================

/**
 * Default logger instance
 * @deprecated Use dependency injection instead
 */
export const defaultLogger = new ConsoleLogger();
