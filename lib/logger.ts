// Simple logger that only logs in development mode
const isDev = process.env.NODE_ENV !== 'production'

export const logger = {
  log: (...args: unknown[]) => {
    if (isDev) {
      console.log(...args)
    }
  },
  error: (...args: unknown[]) => {
    // Always log errors (useful for debugging production issues)
    console.error(...args)
  },
  warn: (...args: unknown[]) => {
    if (isDev) {
      console.warn(...args)
    }
  },
  debug: (...args: unknown[]) => {
    if (isDev) {
      console.log('[DEBUG]', ...args)
    }
  }
}

export default logger
