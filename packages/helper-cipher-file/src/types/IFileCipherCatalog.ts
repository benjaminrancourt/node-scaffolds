import type { IFileCipherCatalogItem, IFileCipherCatalogItemDiff } from './IFileCipherCatalogItem'

export interface IFileCipherCatalog {
  /**
   * Get current catalog items.
   */
  currentItems: IFileCipherCatalogItem[]

  /**
   * Clear the catalog items.
   */
  clear(): void

  /**
   * Check the file for corruption.
   */
  checkIntegrity(params: { sourceFiles?: boolean; encryptedFiles?: boolean }): Promise<void | never>

  /**
   * Update the encrypted data based on the catalog items diff.
   *
   * @param diffItems
   */
  encryptDiff(diffItems: ReadonlyArray<IFileCipherCatalogItemDiff>): Promise<void>

  /**
   * Update the plain data based on the catalog items diff.
   *
   * @param diffItems
   * @param fileCipher
   */
  decryptDiff(diffItems: ReadonlyArray<IFileCipherCatalogItemDiff>): Promise<void>
}