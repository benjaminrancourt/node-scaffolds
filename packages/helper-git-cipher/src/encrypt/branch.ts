import type {
  FileCipherPathResolver,
  IFileCipherBatcher,
  IFileCipherCatalog,
} from '@guanghechen/helper-cipher-file'
import type { IConfigKeeper } from '@guanghechen/helper-config'
import type { IGitCommandBaseParams } from '@guanghechen/helper-git'
import { getCommitInTopology, showCommitInfo } from '@guanghechen/helper-git'
import type { ILogger } from '@guanghechen/utility-types'
import type { IGitCipherConfigData } from '../types'
import { encryptGitCommit } from './commit'

export interface IEncryptGitBranchParams {
  branchName: string
  plain2cryptIdMap: Map<string, string>
  catalog: IFileCipherCatalog
  cipherBatcher: IFileCipherBatcher
  pathResolver: FileCipherPathResolver
  configKeeper: IConfigKeeper<IGitCipherConfigData>
  logger?: ILogger
  getDynamicIv(infos: ReadonlyArray<Buffer>): Readonly<Buffer>
}

/**
 * Encrypt git branch.
 *
 * !!! Required (this method is not recommend to use directly)
 *  - Both the plain repo and crypt repo (could be empty) should be clean (no untracked files).
 *  - The plain repo should have the given branch.
 *  - The plain2cryptIdMap and crypt2plainIdMap should be set correctly.
 *
 * @param params
 */
export async function encryptGitBranch(params: IEncryptGitBranchParams): Promise<void> {
  const {
    branchName,
    plain2cryptIdMap,
    catalog,
    cipherBatcher,
    pathResolver,
    configKeeper,
    logger,
    getDynamicIv,
  } = params
  const plainCmdCtx: IGitCommandBaseParams = { cwd: pathResolver.plainRootDir, logger }
  const cryptCmdCtx: IGitCommandBaseParams = { cwd: pathResolver.cryptRootDir, logger }

  const plainCommitNodes = await getCommitInTopology({
    ...plainCmdCtx,
    branchOrCommitId: branchName,
  })

  for (const plainCommitNode of plainCommitNodes) {
    const plainCommitId: string = plainCommitNode.id
    if (!plain2cryptIdMap.has(plainCommitId)) {
      await encryptGitCommit({
        plainCommitNode,
        plain2cryptIdMap,
        catalog,
        cipherBatcher,
        pathResolver,
        configKeeper,
        logger,
        getDynamicIv,
      })
      const { commitId: cryptCommitId } = await showCommitInfo({
        ...cryptCmdCtx,
        branchOrCommitId: 'HEAD',
      })
      plain2cryptIdMap.set(plainCommitId, cryptCommitId)
    }
  }
}
