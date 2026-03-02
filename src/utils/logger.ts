/**
 * Centralized logging utility
 * Controls logging based on environment
 */

const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * Logger configuration
 */
const LOG_CONFIG = {
  level: isDevelopment ? LogLevel.DEBUG : LogLevel.ERROR,
  enableConsole: isDevelopment || !isProduction,
};

/**
 * Logger utility class
 */
class Logger {
  private shouldLog(level: LogLevel): boolean {
    return level >= LOG_CONFIG.level && LOG_CONFIG.enableConsole;
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(`[INFO] ${message}`, ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  error(message: string, ...args: any[]): void {
    // Always log errors, even in production
    console.error(`[ERROR] ${message}`, ...args);
  }

  /**
   * Log API requests (only in development)
   */
  apiRequest(moduleName: string, url: string): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      this.debug(`[${moduleName}] Requesting: ${url}`);
    }
  }

  /**
   * Log API responses (only in development)
   */
  apiResponse(moduleName: string, status: number, statusText: string): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      this.debug(`[${moduleName}] Response: ${status} ${statusText}`);
    }
  }

  /**
   * Log API success (only in development)
   */
  apiSuccess(moduleName: string, data?: any): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      this.debug(`[${moduleName}] Success`, data);
    }
  }

  /**
   * Log API errors (always logged)
   */
  apiError(moduleName: string, url: string, error: any): void {
    this.error(`[${moduleName}] Request failed for ${url}:`, error);
  }
}

export const logger = new Logger();
export default logger;
