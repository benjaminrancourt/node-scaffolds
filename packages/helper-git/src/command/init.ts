import type { Options as IExecaOptions } from 'execa'
import { execa } from 'execa'
import type { IGitCommandBaseParams } from '../types'

export interface IInitGitRepoParams extends IGitCommandBaseParams {
  defaultBranch?: string
  authorName?: string
  authorEmail?: string
}

export const initGitRepo = async (params: IInitGitRepoParams): Promise<void> => {
  params?.logger?.debug(`[initGitRepo] cwd: {}`, params.cwd)

  // create init commit
  const execaOptions: IExecaOptions = { ...params.execaOptions, cwd: params.cwd }
  await execa('git', ['init'], execaOptions)
  await execa('git', ['branch', '-m', params.defaultBranch ?? 'main'], execaOptions)
  await execa('git', ['config', 'commit.gpgSign', 'false'], execaOptions)

  if (params.authorName) {
    await execa('git', ['config', 'user.name', params.authorName], execaOptions)
  }

  if (params.authorEmail) {
    await execa('git', ['config', 'user.email', params.authorEmail], execaOptions)
  }
}