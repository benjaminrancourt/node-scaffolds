import type { IFileCipherCatalogItemBase } from '@guanghechen/helper-cipher-file'
import type { IGitCommandBaseParams, IGitCommitWithMessage } from '@guanghechen/helper-git'
import { getAllLocalBranches, getCommitWithMessageList, isGitRepo } from '@guanghechen/helper-git'
import type { ILogger } from '@guanghechen/utility-types'
import { createHash } from 'node:crypto'

export const resolveIdMap = async (params: {
  cryptRootDir: string
  plainRootDir: string
  crypt2plainIdMap: ReadonlyMap<string, string>
  logger?: ILogger
}): Promise<{
  crypt2plainIdMap: Map<string, string>
}> => {
  const { plainRootDir, cryptRootDir, logger } = params
  if (!isGitRepo(plainRootDir) || !isGitRepo(cryptRootDir)) {
    return { crypt2plainIdMap: new Map() }
  }

  const crypt2plainIdMap: Map<string, string> = new Map(params.crypt2plainIdMap.entries())

  // Find & remove invalided records from plain repo.
  {
    const plainCmdCtx: IGitCommandBaseParams = { cwd: plainRootDir, logger }
    const plainLocalBranch = await getAllLocalBranches(plainCmdCtx)
    const plainCommitList: IGitCommitWithMessage[] = await getCommitWithMessageList({
      ...plainCmdCtx,
      branchOrCommitIds: plainLocalBranch.branches,
    })
    const plainCommitIdSet: Set<string> = new Set(plainCommitList.map(item => item.id))
    for (const [cryptId, plainId] of params.crypt2plainIdMap.entries()) {
      if (!plainCommitIdSet.has(plainId)) crypt2plainIdMap.delete(cryptId)
    }
  }

  // Find & remove invalided records from crypt repo.
  {
    const cryptCmdCtx: IGitCommandBaseParams = { cwd: cryptRootDir, logger }
    const cryptLocalBranch = await getAllLocalBranches(cryptCmdCtx)
    const cryptCommitList: IGitCommitWithMessage[] = await getCommitWithMessageList({
      ...cryptCmdCtx,
      branchOrCommitIds: cryptLocalBranch.branches,
    })
    const cryptCommitIdSet: Set<string> = new Set(cryptCommitList.map(item => item.id))
    for (const cryptId of params.crypt2plainIdMap.keys()) {
      if (!cryptCommitIdSet.has(cryptId)) crypt2plainIdMap.delete(cryptId)
    }
  }

  return { crypt2plainIdMap }
}

export const generateCommitHash = (items: IFileCipherCatalogItemBase[]): string => {
  const sha256 = createHash('sha256')
  for (const item of items) {
    sha256.update(item.plainFilepath)
    sha256.update(item.fingerprint)
  }
  return sha256.digest().toString('hex')
}
