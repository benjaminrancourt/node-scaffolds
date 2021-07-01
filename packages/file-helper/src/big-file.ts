import invariant from '@guanghechen/invariant'
import fs from 'fs-extra'
import type { FilePartItem } from './types'

export interface BigFileHelperOptions {
  /**
   * The suffix name of a file part.
   * @default '.ghc-part'
   */
  readonly partSuffix?: string
}

/**
 * Inspired by https://github.com/tomvlk/node-split-file.
 */
export class BigFileHelper {
  public readonly partSuffix: string

  constructor(options: BigFileHelperOptions = {}) {
    this.partSuffix = options.partSuffix ?? '.ghc-part'
  }

  /**
   * Calculate the name of parts of sourcefile respectively.
   *
   * @param filepath
   * @param parts
   * @returns
   */
  public calcPartFilepaths(filepath: string, parts: FilePartItem[]): string[] {
    if (parts.length <= 1) return [filepath]

    // Part name (file name of part)
    // get the max number of digits to generate for part number
    // ex. if original file is split into 4 files, then it will be 1
    // ex. if original file is split into 14 files, then it will be 2
    // etc.
    const maxPaddingCount = String(parts.length).length

    const partFilepaths = parts.map(part => {
      // construct part number for current file part
      // <file>.sf-part01
      // ...
      // <file>.sf-part14
      const partCode = String(part.sid).padStart(maxPaddingCount, '0')
      return filepath + this.partSuffix + partCode
    })

    return partFilepaths
  }

  /**
   * Split file with part descriptions.
   *
   * @param filepath
   * @param parts
   * @returns
   */
  public async split(
    filepath: string,
    parts: FilePartItem[],
  ): Promise<string[]> {
    if (parts.length <= 1) return [filepath]

    const tasks: Array<Promise<void>> = []
    const partFilepaths: string[] = this.calcPartFilepaths(filepath, parts)

    for (let i = 0; i < partFilepaths.length; ++i) {
      const part = parts[i]
      const partFilepath = partFilepaths[i]

      // Create a range in the specified range of the file.
      const reader = fs.createReadStream(filepath, {
        start: part.start,
        end: part.end - 1,
      })

      // Save part
      const task = new Promise<void>((resolve, reject) => {
        const writer = fs.createWriteStream(partFilepath)
        reader.on('error', reject)
        reader.on('finish', resolve)
        reader.on('close', resolve)
        reader.pipe(writer)
      })

      // The operation of splitting the source file can be processed in parallel.
      tasks.push(task)
    }

    await Promise.all(tasks)
    return partFilepaths
  }

  /**
   * Merge files
   *
   * @param inputFilepaths
   * @param outputFilepath
   */
  public async merge(
    inputFilepaths: string[],
    outputFilepath: string,
  ): Promise<void> {
    invariant(inputFilepaths.length > 0, 'Input file list is empty!')

    const writer = fs.createWriteStream(outputFilepath, {})
    for (const filepath of inputFilepaths) {
      // The operation of merging files could not be processed in parallel.
      await new Promise<void>((resolve, reject) => {
        const reader = fs.createReadStream(filepath, {})
        reader.on('error', reject)
        reader.on('finish', resolve)
        reader.on('close', resolve)
        reader.pipe(writer, { end: false })
      })
    }
    writer.close()
  }
}

export const bigFileHelper = new BigFileHelper()
