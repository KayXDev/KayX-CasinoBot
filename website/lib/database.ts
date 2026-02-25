/**
 * Utilities for database operations
 */

/**
 * Converts undefined values to null for MySQL compatibility
 * MySQL requires null instead of undefined for nullable fields
 */
export function sanitizeForDB<T>(value: T): T | null {
  return value === undefined ? null : value
}

/**
 * Sanitizes an array of parameters for MySQL
 */
export function sanitizeParams(params: any[]): any[] {
  return params.map(param => sanitizeForDB(param))
}

/**
 * Safe execute wrapper that sanitizes parameters
 */
export async function safeExecute(connection: any, query: string, params: any[] = []) {
  return await connection.execute(query, sanitizeParams(params))
}

/**
 * Database configuration object
 */
export const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'casino_bot'
}