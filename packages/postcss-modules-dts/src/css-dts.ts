import { writeFile } from '@guanghechen/helper-fs'
import { coverBoolean, coverString } from '@guanghechen/helper-option'
import reservedWords from 'reserved-words'
import type { ICssDtsProcessorProps, IGetCSSTokenHook } from './types'

export class CSSDtsProcessor implements IGetCSSTokenHook {
  public readonly indent: string
  public readonly semicolon: string
  public readonly encoding: BufferEncoding
  public readonly dtsForCompiledCss: boolean
  public readonly shouldIgnore: Exclude<ICssDtsProcessorProps['shouldIgnore'], undefined>

  constructor(props: ICssDtsProcessorProps) {
    this.indent = coverString('  ', props.indent)
    this.semicolon = coverBoolean(false, props.semicolon) ? ';' : ''
    this.encoding = coverString<BufferEncoding>('utf8', props.encoding)
    this.dtsForCompiledCss = coverBoolean(false, props.dtsForCompiledCss)
    this.shouldIgnore = props.shouldIgnore != null ? props.shouldIgnore : () => false
  }

  /**
   *
   * @param cssPath
   * @param json
   * @param outputFilePath
   * @see https://github.com/css-modules/postcss-modules#saving-exported-classes
   */
  public async getJSON(
    cssPath: string,
    json: Record<string, string>,
    outputFilePath: string,
  ): Promise<void> {
    if (this.shouldIgnore(cssPath, json, outputFilePath)) return

    const classNames: string[] = Object.keys(json)
    const dtsContent: string = this.calcDts(classNames)

    // Generate *.d.ts
    await writeFile(cssPath + '.d.ts', dtsContent)
    if (this.dtsForCompiledCss) {
      await writeFile(outputFilePath + '.d.ts', dtsContent, { encoding: this.encoding })
    }
  }

  /**
   * calc content of .d.ts
   * @param classNames
   */
  protected calcDts(classNames: string[]): string {
    const { indent, semicolon } = this
    const uniqueName = 'stylesheet'
    return classNames
      .sort()
      .filter(x => !/[-]/.test(x) && !reservedWords.check(x))
      .map(x => `export const ${x}: string${semicolon}`)
      .join('\n')
      .concat('\n\n\n')
      .concat('interface Stylesheet {\n')
      .concat(classNames.map(x => `${indent}'${x}': string`).join('\n'))
      .concat('\n}\n\n\n')
      .concat(`declare const ${uniqueName}: Stylesheet${semicolon}\n`)
      .concat(`export default ${uniqueName}${semicolon}\n`)
  }
}
