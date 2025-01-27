/**
 * Remove properties that exist in `U` from `T`
 */
export type Diff<T extends object, U extends object> = Pick<T, Exclude<keyof T, keyof U>>

/**
 * Make all properties in `T` mutable.
 * @see https://stackoverflow.com/a/46634877
 */
export type Mutable<T extends object> = { -readonly [P in keyof T]: T[P] }

/**
 * Make a set of properties by key `K` become optional from `T`.
 */
export type PickPartial<T extends object, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

/**
 * The type is either a promise of type `T` or the value `T` itself.
 */
export type PromiseOr<T> = Promise<T> | T

/**
 * Simple logger interface.
 */
export interface ILogger {
  /**
   * Print debug messages.
   * @param messageFormat
   * @param messages
   */
  debug(messageFormat: string, ...messages: any[]): void

  /**
   * Print verbose messages.
   * @param messageFormat
   * @param messages
   */
  verbose(messageFormat: string, ...messages: any[]): void

  /**
   * Print information messages.
   * @param messageFormat
   * @param messages
   */
  info(messageFormat: string, ...messages: any[]): void

  /**
   * Print warning messages.
   * @param messageFormat
   * @param messages
   */
  warn(messageFormat: string, ...messages: any[]): void

  /**
   * Print error messages.
   * @param messageFormat
   * @param messages
   */
  error(messageFormat: string, ...messages: any[]): void

  /**
   * Print critical error messages.
   * @param messageFormat
   * @param messages
   */
  fatal(messageFormat: string, ...messages: any[]): void
}
