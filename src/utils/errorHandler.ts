/**
 * Centralized Error Reporting Utility
 *
 * Provides consistent error handling across the application by:
 * - Logging errors to console for local debugging
 * - Reporting errors to Sentry with structured context
 * - Normalizing different error types (Error, string, DOMException, etc.)
 */

/**
 * Error severity levels matching Sentry's SeverityLevel
 */
export type ErrorLevel = 'error' | 'warning' | 'info' | 'debug'

/**
 * Context metadata for error reporting
 * Extends Sentry's scope options with application-specific fields
 */
export interface ErrorContext {
  /** Source module/component where error occurred (e.g., 'BoardsStore', 'IndexedDBAdapter') */
  source: string

  /** User-facing operation description (e.g., 'saving board', 'loading thumbnails') */
  operation?: string

  /** Error severity level (default: 'error') */
  level?: ErrorLevel

  /** Additional structured data to attach to the error */
  extra?: Record<string, unknown>

  /** Custom tags for filtering/grouping in Sentry */
  tags?: Record<string, string | number | boolean>

  /** Board ID if error is board-related (helps with debugging) */
  boardId?: string

  /** Whether to skip console logging (default: false) */
  skipConsole?: boolean
}

/**
 * Normalized error object for internal processing
 */
interface NormalizedError {
  message: string
  name: string
  stack?: string
  originalError: unknown
}

/**
 * Normalize various error types into a consistent format
 * Handles: Error objects, strings, DOMException, unknown types
 *
 * @param err - Error to normalize (any type)
 * @returns Normalized error object with consistent structure
 */
function normalizeError(err: unknown): NormalizedError {
  // Error object
  if (err instanceof Error) {
    return {
      message: err.message,
      name: err.name,
      stack: err.stack,
      originalError: err
    }
  }

  // String error
  if (typeof err === 'string') {
    return {
      message: err,
      name: 'StringError',
      originalError: err
    }
  }

  // DOMException (common in IndexedDB/localStorage)
  if (err instanceof DOMException) {
    return {
      message: err.message,
      name: err.name,
      stack: err.stack,
      originalError: err
    }
  }

  // Unknown/null/undefined
  return {
    message: 'Unknown error occurred',
    name: 'UnknownError',
    originalError: err
  }
}

/**
 * Report an error to console and Sentry
 *
 * @param err - Error to report (Error object, string, or unknown)
 * @param context - Error context metadata
 * @returns Normalized error object for further handling
 *
 * @example
 * try {
 *   await storageAdapter.saveBoard(board)
 * } catch (err) {
 *   reportError(err, {
 *     source: 'BoardsStore',
 *     operation: 'saving board',
 *     boardId: board.id,
 *     extra: { boardName: board.name }
 *   })
 * }
 */
export function reportError(
  err: unknown,
  context: ErrorContext
): NormalizedError {
  const normalized = normalizeError(err)
  const level = context.level || 'error'

  // 1. Console logging for local debugging
  if (!context.skipConsole) {
    const prefix = `[ErrorHandler:${context.source}]`
    const message = context.operation
      ? `${context.operation} failed: ${normalized.message}`
      : normalized.message

    // Use appropriate console method based on level
    const consoleMethod = level === 'warning' ? console.warn
      : level === 'info' ? console.info
        : console.error

    consoleMethod(prefix, message, {
      error: normalized.originalError,
      context: context.extra
    })
  }

  // 2. Send to Sentry with context
  import('@sentry/vue').then(Sentry => {
    Sentry.withScope(scope => {
      // Set level
      scope.setLevel(level)

      // Set context tags
      scope.setTag('source', context.source)
      if (context.operation) {
        scope.setTag('operation', context.operation)
      }
      if (context.boardId) {
        scope.setTag('boardId', context.boardId)
      }

      // Add custom tags
      if (context.tags) {
        Object.entries(context.tags).forEach(([key, value]) => {
          scope.setTag(key, value)
        })
      }

      // Add extra context data
      if (context.extra) {
        scope.setContext('additional_info', context.extra)
      }

      // Capture the error (Sentry handles Error vs string automatically)
      if (normalized.originalError instanceof Error) {
        Sentry.captureException(normalized.originalError)
      } else {
        Sentry.captureMessage(normalized.message, level)
      }
    })
  }).catch(sentryErr => {
    // Fallback if Sentry import fails (shouldn't happen, but defensive)
    console.error('[ErrorHandler] Failed to report to Sentry:', sentryErr)
  })

  return normalized
}

/**
 * Report a non-error message to Sentry (for tracking important events)
 *
 * @param message - Message to report
 * @param context - Context metadata (without 'operation' field)
 *
 * @example
 * reportMessage('Legacy data migration completed', {
 *   source: 'BoardsStore',
 *   level: 'info',
 *   extra: { boardCount: migratedBoards.length }
 * })
 */
export function reportMessage(
  message: string,
  context: Omit<ErrorContext, 'operation'>
): void {
  const level = context.level || 'info'

  if (!context.skipConsole) {
    const prefix = `[ErrorHandler:${context.source}]`
    console.log(prefix, message, context.extra)
  }

  import('@sentry/vue').then(Sentry => {
    Sentry.withScope(scope => {
      scope.setLevel(level)
      scope.setTag('source', context.source)

      if (context.tags) {
        Object.entries(context.tags).forEach(([key, value]) => {
          scope.setTag(key, value)
        })
      }

      if (context.extra) {
        scope.setContext('additional_info', context.extra)
      }

      Sentry.captureMessage(message, level)
    })
  })
}
