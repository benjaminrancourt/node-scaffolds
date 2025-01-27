/**
 * Copied from https://github.com/blakeembrey/change-case/blob/32d22ffec5b5a9e7ae6f336ac1823c14f6223703/packages/change-case/src/index.ts
 *
 * Reason: the original repo support esm only while we need to bundle CommonJS.
 */

/**
 * Supported locale values. Use `false` to ignore locale.
 * Defaults to `undefined`, which uses the host environment.
 */
export type Locale = string[] | string | false | undefined

export interface Options extends SplitOptions {
  locale?: Locale
}

export interface ICaseTransformer {
  (input: string): string
}

export interface ICaseTransformerWithIndex {
  (input: string, index: number): string
}

export interface ICaseTransformFactor {
  (lower: ICaseTransformer, upper: ICaseTransformer): ICaseTransformerWithIndex
}

/**
 * Convert a string to space separated lower case (`foo bar`).
 */
export function noCase(input: string, options?: Options): string {
  return split(input, options)
    .map(lowerFactory(options?.locale))
    .join(' ')
}

// Regexps involved with splitting words in various case formats.
const SPLIT_LOWER_UPPER_RE = /([\p{Ll}\d])(\p{Lu})/gu
const SPLIT_UPPER_UPPER_RE = /(\p{Lu})([\p{Lu}][\p{Ll}])/gu
const SPLIT_NUMBER_LOWER_RE = /(\d)(\p{Ll})/gu
const SPLIT_LETTER_NUMBER_RE = /(\p{L})(\d)/gu

// Regexp involved with stripping non-word characters from the result.
const DEFAULT_STRIP_REGEXP = /[^\p{L}\d]+/giu

// The replacement value for splits.
const SPLIT_REPLACE_VALUE = '$1\0$2'

export interface SplitOptions {
  separateNumbers?: boolean
}

/**
 * Split any cased input strings into an array of words.
 */
export function split(input: string, options: SplitOptions = {}): string[] {
  let result = input
    .replace(SPLIT_LOWER_UPPER_RE, SPLIT_REPLACE_VALUE)
    .replace(SPLIT_UPPER_UPPER_RE, SPLIT_REPLACE_VALUE)

  if (options.separateNumbers) {
    result = result
      .replace(SPLIT_NUMBER_LOWER_RE, SPLIT_REPLACE_VALUE)
      .replace(SPLIT_LETTER_NUMBER_RE, SPLIT_REPLACE_VALUE)
  }

  result = result.replace(DEFAULT_STRIP_REGEXP, '\0')

  let start = 0
  let end = result.length

  // Trim the delimiter from around the output string.
  while (result.charAt(start) === '\0') start += 1
  if (start === end) return []
  while (result.charAt(end - 1) === '\0') end -= 1

  // Transform each token independently.
  return result.slice(start, end).split(/\0/g)
}

/**
 * Convert a string to camel case (`fooBar`).
 */
export function camelCase(input: string, options?: Options): string {
  const lower = lowerFactory(options?.locale)
  const upper = upperFactory(options?.locale)
  const transform = pascalCaseTransformFactory(lower, upper)
  return split(input, options)
    .map((word, index) => {
      if (index === 0) return lower(word)
      return transform(word, index)
    })
    .join('')
}

/**
 * Convert a string to pascal case (`FooBar`).
 */
export function pascalCase(input: string, options?: Options): string {
  const lower = lowerFactory(options?.locale)
  const upper = upperFactory(options?.locale)
  return split(input, options).map(pascalCaseTransformFactory(lower, upper)).join('')
}

/**
 * Convert a string to pascal snake case (`Foo_Bar`).
 */
export function pascalSnakeCase(input: string, options?: Options): string {
  const lower = lowerFactory(options?.locale)
  const upper = upperFactory(options?.locale)
  return split(input, options).map(capitalCaseTransformFactory(lower, upper)).join('_')
}

/**
 * Convert a string to capital case (`Foo Bar`).
 */
export function capitalCase(input: string, options?: Options): string {
  const lower = lowerFactory(options?.locale)
  const upper = upperFactory(options?.locale)
  return split(input, options).map(capitalCaseTransformFactory(lower, upper)).join(' ')
}

/**
 * Convert a string to constant case (`FOO_BAR`).
 */
export function constantCase(input: string, options?: Options): string {
  const upper = upperFactory(options?.locale)
  return split(input, options).map(upper).join('_')
}

/**
 * Convert a string to dot case (`foo.bar`).
 */
export function dotCase(input: string, options?: Options): string {
  const lower = lowerFactory(options?.locale)
  return split(input, options).map(lower).join('.')
}

/**
 * Convert a string to kebab case (`foo-bar`).
 */
export function kebabCase(input: string, options?: Options): string {
  const lower = lowerFactory(options?.locale)
  return split(input, options).map(lower).join('-')
}

/**
 * Convert a string to path case (`foo/bar`).
 */
export function pathCase(input: string, options?: Options): string {
  const lower = lowerFactory(options?.locale)
  return split(input, options).map(lower).join('/')
}

/**
 * Convert a string to path case (`Foo bar`).
 */
export function sentenceCase(input: string, options?: Options): string {
  const lower = lowerFactory(options?.locale)
  const upper = upperFactory(options?.locale)
  const transform = capitalCaseTransformFactory(lower, upper)
  return split(input, options)
    .map((word, index) => {
      if (index === 0) return transform(word, index)
      return lower(word)
    })
    .join(' ')
}

/**
 * Convert a string to snake case (`foo_bar`).
 */
export function snakeCase(input: string, options?: Options): string {
  const lower = lowerFactory(options?.locale)
  return split(input, options).map(lower).join('_')
}

/**
 * Convert a string to header case (`Foo-Bar`).
 */
export function trainCase(input: string, options?: Options): string {
  const lower = lowerFactory(options?.locale)
  const upper = upperFactory(options?.locale)
  return split(input, options).map(capitalCaseTransformFactory(lower, upper)).join('-')
}

function lowerFactory(locale: Locale): (input: string) => string {
  return locale === false
    ? (input: string) => input.toLowerCase()
    : (input: string) => input.toLocaleLowerCase(locale)
}

function upperFactory(locale: Locale): (input: string) => string {
  return locale === false
    ? (input: string) => input.toUpperCase()
    : (input: string) => input.toLocaleUpperCase(locale)
}

const capitalCaseTransformFactory: ICaseTransformFactor = (
  lower: ICaseTransformer,
  upper: ICaseTransformer,
): ICaseTransformer => {
  return (word: string): string => `${upper(word[0])}${lower(word.slice(1))}`
}

const pascalCaseTransformFactory: ICaseTransformFactor = (
  lower: ICaseTransformer,
  upper: ICaseTransformer,
): ICaseTransformerWithIndex => {
  return (word: string, index: number): string => {
    const char0 = word[0]
    const initial = index > 0 && char0 >= '0' && char0 <= '9' ? '_' + char0 : upper(char0)
    return initial + lower(word.slice(1))
  }
}
