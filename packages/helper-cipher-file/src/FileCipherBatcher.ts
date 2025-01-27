import type { Logger } from '@guanghechen/chalk-logger'
import type { FileSplitter, IFilePartItem } from '@guanghechen/file-split'
import { calcFilePartItemsBySize } from '@guanghechen/file-split'
import { isFileSync, mkdirsIfNotExists, rm } from '@guanghechen/helper-fs'
import invariant from '@guanghechen/invariant'
import type { IWorkspacePathResolver } from '@guanghechen/path.types'
import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import { calcCryptFilepaths } from './catalog/calcCryptFilepath'
import type { IFileCipher } from './types/IFileCipher'
import type {
  IBatchDecryptParams,
  IBatchEncryptParams,
  IFileCipherBatcher,
} from './types/IFileCipherBatcher'
import type { IFileCipherCatalogDiffItem } from './types/IFileCipherCatalogDiffItem'
import { FileChangeType } from './types/IFileCipherCatalogDiffItem'
import type {
  IFileCipherCatalogItem,
  IFileCipherCatalogItemDraft,
} from './types/IFileCipherCatalogItem'
import type { IFileCipherFactory } from './types/IFileCipherFactory'

export interface IFileCipherBatcherProps {
  fileSplitter: FileSplitter
  fileCipherFactory: IFileCipherFactory
  maxTargetFileSize: number
  logger?: Logger
}

export class FileCipherBatcher implements IFileCipherBatcher {
  public readonly fileSplitter: FileSplitter
  public readonly fileCipherFactory: IFileCipherFactory
  public readonly maxTargetFileSize: number
  public readonly logger: Logger | undefined

  constructor(props: IFileCipherBatcherProps) {
    this.fileCipherFactory = props.fileCipherFactory
    this.fileSplitter = props.fileSplitter
    this.maxTargetFileSize = props.maxTargetFileSize
    this.logger = props.logger
  }

  public async batchEncrypt(params: IBatchEncryptParams): Promise<IFileCipherCatalogDiffItem[]> {
    const title = 'batchEncrypt'
    const { strictCheck, plainPathResolver, cryptPathResolver, diffItems, getIv } = params
    const { logger, fileCipherFactory, fileSplitter, maxTargetFileSize } = this

    const results: IFileCipherCatalogDiffItem[] = []
    for (const diffItem of diffItems) {
      const { changeType } = diffItem
      switch (changeType) {
        case FileChangeType.ADDED: {
          await this._ensureCryptPathNotExist(
            diffItem.newItem,
            strictCheck,
            cryptPathResolver,
            cryptFilepath =>
              `[${title}] Bad diff item (${changeType}), crypt file already exists. (${cryptFilepath})`,
          )
          const nextNewItem = await add(diffItem.newItem, changeType)
          results.push({
            changeType: FileChangeType.ADDED,
            newItem: nextNewItem,
          })
          break
        }
        case FileChangeType.MODIFIED: {
          await remove(diffItem.oldItem, changeType)
          const nextNewItem = await add(diffItem.newItem, changeType)
          results.push({
            changeType: FileChangeType.MODIFIED,
            oldItem: diffItem.oldItem,
            newItem: nextNewItem,
          })
          break
        }
        case FileChangeType.REMOVED: {
          await this._ensurePlainPathNotExist(
            diffItem.oldItem,
            strictCheck,
            plainPathResolver,
            plainFilepath =>
              `[${title}] Bad diff item (${changeType}), plain file should not exist. (${plainFilepath})`,
          )
          await remove(diffItem.oldItem, changeType)
          results.push({
            changeType: FileChangeType.REMOVED,
            oldItem: diffItem.oldItem,
          })
          break
        }
      }
    }
    return results

    async function add(
      item: IFileCipherCatalogItemDraft,
      changeType: FileChangeType,
    ): Promise<IFileCipherCatalogItem> {
      const { plainFilepath, cryptFilepath } = item
      const absolutePlainFilepath = plainPathResolver.resolve(plainFilepath)
      invariant(
        isFileSync(absolutePlainFilepath),
        `[${title}.add] Bad diff item (${changeType}), plain file does not exist or it is not a file. (${plainFilepath})`,
      )

      const absoluteCryptFilepath = cryptPathResolver.resolve(cryptFilepath)
      mkdirsIfNotExists(absoluteCryptFilepath, false, logger)

      const nextItem: IFileCipherCatalogItem = { ...item, iv: undefined, authTag: undefined }
      if (item.keepPlain) {
        await fs.copyFile(absolutePlainFilepath, absoluteCryptFilepath)
      } else {
        const iv = await getIv(item)
        const fileCipher: IFileCipher = fileCipherFactory.fileCipher({ iv })
        const { authTag } = await fileCipher.encryptFile(
          absolutePlainFilepath,
          absoluteCryptFilepath,
        )

        nextItem.iv = iv
        nextItem.authTag = authTag
      }

      // Split encrypted file.
      {
        const parts: IFilePartItem[] = calcFilePartItemsBySize(
          await fs.stat(absoluteCryptFilepath).then(md => md.size),
          maxTargetFileSize,
        )
        if (parts.length > 1) {
          const partFilepaths: string[] = await fileSplitter.split(absoluteCryptFilepath, parts)
          const relativeCryptFilepath: string = cryptPathResolver.relative(cryptFilepath)
          const cryptFilepathParts: string[] = partFilepaths.map(p =>
            cryptPathResolver.relative(p).slice(relativeCryptFilepath.length),
          )

          nextItem.cryptFilepathParts = cryptFilepathParts

          // Remove the original big crypt file.
          await fs.unlink(absoluteCryptFilepath)
        }
      }
      return nextItem
    }

    async function remove(
      item: IFileCipherCatalogItemDraft,
      changeType: FileChangeType,
    ): Promise<void> {
      const cryptFilepaths = calcCryptFilepaths(item.cryptFilepath, item.cryptFilepathParts)

      // pre-check
      for (const cryptFilepath of cryptFilepaths) {
        const absoluteCryptFilepath = cryptPathResolver.resolve(cryptFilepath)
        if (strictCheck) {
          invariant(
            isFileSync(absoluteCryptFilepath),
            `[${title}.remove] Bad diff item (${changeType}), crypt file does not exist or it is not a file. (${cryptFilepath})`,
          )
          await fs.unlink(absoluteCryptFilepath)
        } else {
          await rm(absoluteCryptFilepath)
        }
      }
    }
  }

  public async batchDecrypt(params: IBatchDecryptParams): Promise<void> {
    const title = 'batchDecrypt'
    const { strictCheck, diffItems, plainPathResolver, cryptPathResolver } = params
    const { logger, fileCipherFactory, fileSplitter } = this

    // Plain filepath should always pointer to the plain contents,
    // while crypt files indicate those encrypted contents.
    for (const diffItem of diffItems) {
      const { changeType } = diffItem
      switch (changeType) {
        case FileChangeType.ADDED: {
          await this._ensurePlainPathNotExist(
            diffItem.newItem,
            strictCheck,
            plainPathResolver,
            plainFilepath =>
              `[${title}] Bad diff item (${changeType}), plain file already exists. (${plainFilepath})`,
          )
          await add(diffItem.newItem, changeType)
          break
        }
        case FileChangeType.MODIFIED: {
          await remove(diffItem.oldItem, changeType)
          await add(diffItem.newItem, changeType)
          break
        }
        case FileChangeType.REMOVED: {
          await this._ensureCryptPathNotExist(
            diffItem.oldItem,
            strictCheck,
            cryptPathResolver,
            cryptFilepath =>
              `[${title}] Bad diff item (REMOVED), crypt file should not exist. (${cryptFilepath})`,
          )
          await remove(diffItem.oldItem, changeType)
          break
        }
      }
    }

    async function add(item: IFileCipherCatalogItem, changeType: FileChangeType): Promise<void> {
      const cryptFilepaths = calcCryptFilepaths(item.cryptFilepath, item.cryptFilepathParts)
      const absoluteCryptFilepaths: string[] = []

      // pre-check
      for (const cryptFilepath of cryptFilepaths) {
        const absoluteCryptFilepath = cryptPathResolver.resolve(cryptFilepath)
        absoluteCryptFilepaths.push(absoluteCryptFilepath)

        invariant(
          isFileSync(absoluteCryptFilepath),
          `[${title}.add] Bad diff item (${changeType}), crypt file does not exist or it is not a file. (${cryptFilepath})`,
        )
      }

      const absolutePlainFilepath = plainPathResolver.resolve(item.plainFilepath)
      mkdirsIfNotExists(absolutePlainFilepath, false, logger)

      if (item.keepPlain) {
        await fileSplitter.merge(absoluteCryptFilepaths, absolutePlainFilepath)
      } else {
        const fileCipher = fileCipherFactory.fileCipher({ iv: item.iv })
        await fileCipher.decryptFiles(absoluteCryptFilepaths, absolutePlainFilepath, {
          authTag: item.authTag,
        })
      }
    }

    async function remove(item: IFileCipherCatalogItem, changeType: FileChangeType): Promise<void> {
      const { plainFilepath } = item
      const absolutePlainFilepath = plainPathResolver.resolve(plainFilepath)

      if (strictCheck) {
        invariant(
          isFileSync(absolutePlainFilepath),
          `[${title}.remove] Bad diff item (${changeType}), plain file does not exist or it is not a file. (${plainFilepath})`,
        )
        await fs.unlink(absolutePlainFilepath)
      } else {
        await rm(absolutePlainFilepath)
      }
    }
  }

  // @overridable
  protected async _ensurePlainPathNotExist(
    item: Readonly<IFileCipherCatalogItem>,
    strictCheck: boolean,
    plainPathResolver: IWorkspacePathResolver,
    getErrorMsg: (plainFilepath: string) => string,
  ): Promise<void> {
    const { plainFilepath } = item
    const absolutePlainFilepath = plainPathResolver.resolve(plainFilepath)
    if (strictCheck) {
      invariant(!existsSync(absolutePlainFilepath), () => getErrorMsg(plainFilepath))
    } else {
      await rm(absolutePlainFilepath)
    }
  }

  // @overridable
  protected async _ensureCryptPathNotExist(
    item: Readonly<IFileCipherCatalogItemDraft>,
    strictCheck: boolean,
    cryptPathResolver: IWorkspacePathResolver,
    getErrorMsg: (cryptFilepath: string) => string,
  ): Promise<void | never> {
    const cryptFilepaths = calcCryptFilepaths(item.cryptFilepath, item.cryptFilepathParts)
    for (const cryptFilepath of cryptFilepaths) {
      const absoluteCryptFilepath = cryptPathResolver.resolve(cryptFilepath)
      if (strictCheck) {
        invariant(!existsSync(absoluteCryptFilepath), () => getErrorMsg(cryptFilepath))
      } else {
        await rm(absoluteCryptFilepath)
      }
    }
  }
}
