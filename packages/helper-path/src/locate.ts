import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'

/**
 * Locate a nearest filepath from the given `currentDir` which name included in the give `filenames`.
 *
 * @param currentDir
 * @param filenames
 * @returns
 */
export function locateNearestFilepath(
  currentDir0: string,
  filenames: string | string[],
): string | null {
  // eslint-disable-next-line no-param-reassign
  filenames = [filenames].flat()
  return recursiveLocate(currentDir0.replace(/^file:\/\//, ''))

  function recursiveLocate(currentDir: string): string | null {
    for (const filename of filenames) {
      const filepath = path.join(currentDir, filename)
      if (existsSync(filepath)) return filepath
    }

    const parentDir = path.dirname(currentDir)
    if (parentDir === currentDir || !path.isAbsolute(parentDir)) return null

    // Recursively locate.
    return locateNearestFilepath(parentDir, filenames)
  }
}

/**
 * Find a nearest filepath from the give `currentDir`which matched the give tester `testFilepath`.
 *
 * @param currentDir
 * @param predicate
 * @returns
 */
export function findNearestFilepath(
  currentDir: string,
  predicate: (filepath: string) => boolean,
): string | null {
  const filenames = readdirSync(currentDir)
  for (const filename of filenames) {
    const filepath = path.join(currentDir, filename)
    if (predicate(filepath)) return filepath
  }

  const parentDir = path.dirname(currentDir)
  if (parentDir === currentDir) return null

  // Recursively locate.
  return findNearestFilepath(parentDir, predicate)
}
