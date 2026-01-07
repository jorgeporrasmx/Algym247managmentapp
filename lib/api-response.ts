import { NextResponse } from 'next/server'

/**
 * Standard API response helpers for consistent response formatting
 */

interface SuccessResponseMeta {
  total?: number
  page?: number
  totalPages?: number
  [key: string]: unknown
}

/**
 * Create a successful API response
 * @param data - The data to return
 * @param meta - Optional metadata (pagination, counts, etc.)
 * @param status - HTTP status code (default: 200)
 */
export function successResponse<T>(
  data: T,
  meta?: SuccessResponseMeta,
  status: number = 200
) {
  return NextResponse.json(
    {
      success: true,
      data,
      ...meta
    },
    { status }
  )
}

/**
 * Create an error API response
 * @param message - Error message to return
 * @param status - HTTP status code (default: 400)
 */
export function errorResponse(message: string, status: number = 400) {
  return NextResponse.json(
    {
      success: false,
      error: message
    },
    { status }
  )
}

/**
 * Create a not found API response
 * @param resource - Name of the resource that was not found
 */
export function notFoundResponse(resource: string = 'Resource') {
  return errorResponse(`${resource} not found`, 404)
}

/**
 * Create an unauthorized API response
 * @param message - Custom message (default: "Unauthorized")
 */
export function unauthorizedResponse(message: string = 'Unauthorized') {
  return errorResponse(message, 401)
}

/**
 * Create a forbidden API response
 * @param message - Custom message (default: "Forbidden")
 */
export function forbiddenResponse(message: string = 'Forbidden') {
  return errorResponse(message, 403)
}

/**
 * Create a validation error response
 * @param errors - Validation errors object or message
 */
export function validationErrorResponse(errors: Record<string, string> | string) {
  const message = typeof errors === 'string'
    ? errors
    : Object.entries(errors).map(([field, error]) => `${field}: ${error}`).join(', ')

  return NextResponse.json(
    {
      success: false,
      error: 'Validation error',
      details: typeof errors === 'string' ? undefined : errors,
      message
    },
    { status: 400 }
  )
}

/**
 * Create an internal server error response
 * @param message - Error message (default: "Internal server error")
 */
export function serverErrorResponse(message: string = 'Internal server error') {
  return errorResponse(message, 500)
}

/**
 * Parse JSON body safely with error handling
 * @param request - The incoming request
 * @returns Parsed body or null if invalid
 */
export async function parseJsonBody<T = unknown>(request: Request): Promise<{
  data: T | null
  error: NextResponse | null
}> {
  try {
    const data = await request.json() as T
    return { data, error: null }
  } catch {
    return {
      data: null,
      error: errorResponse('Invalid JSON in request body', 400)
    }
  }
}
