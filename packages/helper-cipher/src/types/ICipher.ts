import type { Cipher, Decipher } from 'node:crypto'

export interface IEncipher extends Cipher {
  /**
   * Get the authentication tag (also known as an "auth tag" or simply "tag").
   *
   * The authentication tag is a fixed-length value that is generated by the encryption process and
   * used to ensure the authenticity and integrity of the encrypted data.
   */
  getAuthTag?(): Buffer
}

export interface IDecipher extends Decipher {}

export interface IDecipherOptions {
  /**
   * The authentication tag.
   */
  authTag: Buffer | undefined
}

export interface IEncryptResult {
  /**
   * Encrypted bytes.
   */
  cryptBytes: Buffer
  /**
   * The authentication tag.
   */
  authTag?: Buffer
}

export interface ICipher {
  /**
   * Check if this instance available.
   */
  readonly alive: boolean

  /**
   * Initial vector in hex.
   */
  readonly iv: string

  /**
   * Construct an encipher.
   */
  encipher(): IEncipher

  /**
   * Construct a decipher.
   */
  decipher(options: IDecipherOptions): IDecipher

  /**
   * Encrypt plain data.
   */
  encrypt(plainBytes: Readonly<Buffer>): IEncryptResult

  /**
   * Decrypt crypt data.
   */
  decrypt(cipherBytes: Readonly<Buffer>, options?: IDecipherOptions): Buffer

  /**
   * Encrypt plain json data.
   */
  encryptJson(plainData: unknown): IEncryptResult

  /**
   * Decrypt crypt json data.
   */
  decryptJson(cipherBytes: Readonly<Buffer>, options?: IDecipherOptions): unknown

  /**
   * Destroy secret and sensitive data.
   */
  cleanup(): void
}
