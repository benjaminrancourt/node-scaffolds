import type { IHashAlgorithm } from '@guanghechen/helper-mac'
import { calcMac, calcMacFromFile } from '@guanghechen/helper-mac'

export const calcFingerprintFromMac = (mac: Buffer): string => mac.toString('hex')

/**
 * Calc fingerprint from literal string.
 *
 * @param text
 * @param textEncoding
 * @returns
 */
export function calcFingerprintFromString(
  text: string,
  textEncoding: BufferEncoding,
  algorithm: IHashAlgorithm,
): string {
  const buffer: Buffer = Buffer.from(text, textEncoding)
  const mac: Buffer = calcMac([buffer], algorithm)
  return calcFingerprintFromMac(mac)
}

/**
 * Calc fingerprint from file.
 *
 * @param mac
 * @returns
 */
export async function calcFingerprintFromFile(
  filepath: string,
  algorithm: IHashAlgorithm,
): Promise<string> {
  const mac = await calcMacFromFile(filepath, algorithm)
  return calcFingerprintFromMac(mac)
}
