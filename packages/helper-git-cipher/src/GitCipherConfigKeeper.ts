import { bytes2text, text2bytes } from '@guanghechen/byte'
import type { ICipher } from '@guanghechen/cipher'
import type { IFileCipherCatalogDiffItemBase } from '@guanghechen/helper-cipher-file'
import { FileChangeType } from '@guanghechen/helper-cipher-file'
import type { IConfigKeeper, IJsonConfigKeeperProps } from '@guanghechen/helper-config'
import { JsonConfigKeeper } from '@guanghechen/helper-config'
import invariant from '@guanghechen/invariant'
import type { PromiseOr } from '@guanghechen/utility-types'
import path from 'node:path'
import type {
  IFileCipherCatalogItemData,
  IFileCipherCatalogItemInstance,
  IGitCipherConfig,
  IGitCipherConfigData,
} from './types'

type Instance = IGitCipherConfig
type Data = IGitCipherConfigData

export interface IGitCipherConfigKeeperProps extends IJsonConfigKeeperProps {
  readonly cipher: ICipher
}

export class GitCipherConfigKeeper
  extends JsonConfigKeeper<Instance, Data>
  implements IConfigKeeper<Instance>
{
  public override readonly __version__ = '5.1.0'
  public override readonly __compatible_version__ = '~5.1.0'
  readonly #cipher: ICipher

  constructor(props: IGitCipherConfigKeeperProps) {
    super(props)
    this.#cipher = props.cipher
  }

  protected override nonce(): string | undefined {
    return undefined
  }

  protected override serialize(instance: Instance): PromiseOr<Data> {
    const title = this.constructor.name
    const cipher = this.#cipher

    const serializeItem = (item: IFileCipherCatalogItemInstance): IFileCipherCatalogItemData => {
      invariant(
        !path.isAbsolute(item.plainFilepath),
        `[${title}] bad catalog, contains absolute filepaths. plainFilepath:(${item.plainFilepath})`,
      )

      const eAuthTag: Uint8Array | undefined =
        item.authTag === undefined
          ? undefined
          : cipher.encrypt(Uint8Array.from(item.authTag)).cryptBytes

      if (item.keepPlain) {
        return {
          plainFilepath: item.plainFilepath,
          fingerprint: item.fingerprint,
          cryptFilepathParts: item.cryptFilepathParts,
          keepPlain: true,
          authTag: eAuthTag === undefined ? undefined : bytes2text(eAuthTag, 'hex'),
        }
      }

      const ePlainFilepath: Uint8Array = cipher.encrypt(
        text2bytes(item.plainFilepath, 'utf8'),
      ).cryptBytes
      const eFingerprint: Uint8Array = cipher.encrypt(
        text2bytes(item.fingerprint, 'hex'),
      ).cryptBytes
      return {
        plainFilepath: bytes2text(ePlainFilepath, 'base64'),
        fingerprint: bytes2text(eFingerprint, 'hex'),
        cryptFilepathParts: item.cryptFilepathParts,
        keepPlain: false,
        authTag: eAuthTag === undefined ? undefined : bytes2text(eAuthTag, 'hex'),
      }
    }

    const commitMessage: string = bytes2text(
      cipher.encrypt(text2bytes(instance.commit.message, 'utf8')).cryptBytes,
      'base64',
    )

    return {
      commit: {
        message: commitMessage,
      },
      catalog: {
        diffItems: instance.catalog.diffItems.map(
          (diffItem): IFileCipherCatalogDiffItemBase<IFileCipherCatalogItemData> => {
            switch (diffItem.changeType) {
              case FileChangeType.ADDED:
                return {
                  changeType: diffItem.changeType,
                  newItem: serializeItem(diffItem.newItem),
                }
              case FileChangeType.MODIFIED:
                return {
                  changeType: diffItem.changeType,
                  oldItem: serializeItem(diffItem.oldItem),
                  newItem: serializeItem(diffItem.newItem),
                }
              case FileChangeType.REMOVED:
                return {
                  changeType: diffItem.changeType,
                  oldItem: serializeItem(diffItem.oldItem),
                }
              /* c8 ignore start */
              default:
                throw new Error(`[${title} unknown changeType`)
              /* c8 ignore end */
            }
          },
        ),
        items: instance.catalog.items
          .sort((x, y) => x.plainFilepath.localeCompare(y.plainFilepath))
          .map(serializeItem),
      },
    }
  }

  protected override deserialize(data: Data): PromiseOr<Instance> {
    const title = this.constructor.name
    const cipher = this.#cipher

    const deserializeItem = (item: IFileCipherCatalogItemData): IFileCipherCatalogItemInstance => {
      const authTag: Uint8Array | undefined = item.authTag
        ? cipher.decrypt(text2bytes(item.authTag, 'hex'))
        : undefined

      if (item.keepPlain) {
        return {
          plainFilepath: item.plainFilepath,
          fingerprint: item.fingerprint,
          cryptFilepathParts: item.cryptFilepathParts,
          keepPlain: true,
          authTag,
        }
      }

      const plainFilepath: string = bytes2text(
        cipher.decrypt(text2bytes(item.plainFilepath, 'base64')),
        'utf8',
      )
      const fingerprint: string = bytes2text(
        cipher.decrypt(text2bytes(item.fingerprint, 'hex')),
        'hex',
      )
      return {
        plainFilepath,
        fingerprint,
        cryptFilepathParts: item.cryptFilepathParts,
        keepPlain: false,
        authTag,
      }
    }

    const commitMessage: string = bytes2text(
      cipher.decrypt(text2bytes(data.commit.message, 'base64')),
      'utf8',
    )

    return {
      commit: {
        message: commitMessage,
      },
      catalog: {
        diffItems: data.catalog.diffItems.map(
          (diffItem): IFileCipherCatalogDiffItemBase<IFileCipherCatalogItemInstance> => {
            switch (diffItem.changeType) {
              case FileChangeType.ADDED:
                return {
                  changeType: diffItem.changeType,
                  newItem: deserializeItem(diffItem.newItem),
                }
              case FileChangeType.MODIFIED:
                return {
                  changeType: diffItem.changeType,
                  oldItem: deserializeItem(diffItem.oldItem),
                  newItem: deserializeItem(diffItem.newItem),
                }
              case FileChangeType.REMOVED:
                return {
                  changeType: diffItem.changeType,
                  oldItem: deserializeItem(diffItem.oldItem),
                }
              /* c8 ignore start */
              default:
                throw new Error(`[${title} unknown changeType`)
              /* c8 ignore end */
            }
          },
        ),
        items: data.catalog.items.map(deserializeItem),
      },
    }
  }
}
