import type {
  ICommandConfigurationFlatOpts,
  ICommandConfigurationOptions,
  IResolveDefaultOptionsParams,
} from '@guanghechen/helper-commander'
import { resolveCommandConfigurationOptions } from '@guanghechen/helper-commander'
import { isNonBlankString } from '@guanghechen/helper-is'
import { convertToBoolean, convertToNumber, cover } from '@guanghechen/helper-option'
import { pathResolver } from '@guanghechen/path'
import path from 'node:path'
import { logger } from '../core/logger'

// Global command options
export interface IGlobalCommandOptions extends ICommandConfigurationOptions {
  /**
   * The directory where the crypt repo located. (relative of workspace or absolute path)
   * @default '{repoName}-crypt'
   */
  readonly cryptRootDir: string
  /**
   * Default encoding of files in the workspace.
   * @default 'utf8'
   */
  readonly encoding: BufferEncoding
  /**
   * The maximum size required of password.
   * @default 100
   */
  readonly maxPasswordLength: number
  /**
   * max wrong password retry times.
   */
  readonly maxRetryTimes: number
  /**
   * The minimum size required of password.
   * @default 6
   */
  readonly minPasswordLength: number
  /**
   * The directory where the plain repo located. (relative of workspace or absolute path)
   * @default '{repoName}-plain'
   */
  readonly plainRootDir: string
  /**
   * The path of secret file. (relative of workspace)
   * @default '.ghc-secret'
   */
  readonly secretFilepath: string
  /**
   * Whether to print password asterisks.
   * @default true
   */
  readonly showAsterisk: boolean
}

// Default value of global options
export const getDefaultGlobalCommandOptions = (
  params: IResolveDefaultOptionsParams,
): IGlobalCommandOptions => {
  const repoName = path.basename(params.workspace)
  return {
    logLevel: logger.level,
    configPath: ['.ghc-config.json'],
    cryptRootDir: `${repoName}-crypt`,
    encoding: 'utf8',
    maxPasswordLength: 100,
    maxRetryTimes: 3,
    minPasswordLength: 6,
    plainRootDir: `${repoName}-plain`,
    secretFilepath: '.ghc-secret.json',
    showAsterisk: true,
  }
}

export function resolveBaseCommandOptions<O extends object>(
  commandName: string,
  subCommandName: string | false,
  getDefaultOptions: (params: IResolveDefaultOptionsParams) => O,
  options: O & IGlobalCommandOptions,
): O & IGlobalCommandOptions & ICommandConfigurationFlatOpts {
  type R = O & IGlobalCommandOptions & ICommandConfigurationFlatOpts
  const baseOptions: R = resolveCommandConfigurationOptions<O & IGlobalCommandOptions>({
    logger,
    commandName,
    subCommandName,
    workspace: undefined,
    defaultOptions: params => ({
      ...getDefaultGlobalCommandOptions(params),
      ...getDefaultOptions(params),
    }),
    options,
  })
  const { workspace } = baseOptions

  // Resolve cryptRootDir
  const cryptRootDir: string = pathResolver.safeResolve(
    workspace,
    cover<string>(baseOptions.cryptRootDir, options.cryptRootDir, isNonBlankString),
  )
  logger.debug('cryptRootDir:', cryptRootDir)

  // Resolve encoding
  const encoding: BufferEncoding = cover<BufferEncoding>(
    baseOptions.encoding,
    options.encoding,
    isNonBlankString,
  )
  logger.debug('encoding:', encoding)

  // Resolve maxPasswordLength
  const maxPasswordLength: number = cover<number>(
    baseOptions.maxPasswordLength,
    convertToNumber(options.maxPasswordLength),
  )
  logger.debug('maxPasswordLength:', maxPasswordLength)

  // Resolve maxRetryTimes
  const maxRetryTimes: number = cover<number>(
    baseOptions.maxRetryTimes,
    convertToNumber(options.maxRetryTimes),
  )
  logger.debug('maxRetryTimes:', maxRetryTimes)

  // Resolve minPasswordLength
  const minPasswordLength: number = cover<number>(
    baseOptions.minPasswordLength,
    convertToNumber(options.minPasswordLength),
  )
  logger.debug('minPasswordLength:', minPasswordLength)

  // Resolve plainRootDir
  const plainRootDir: string = pathResolver.safeResolve(
    workspace,
    cover<string>(baseOptions.plainRootDir, options.plainRootDir, isNonBlankString),
  )
  logger.debug('plainRootDir:', plainRootDir)

  // Resolve secretFilepath
  const secretFilepath: string = pathResolver.safeResolve(
    workspace,
    cover<string>(baseOptions.secretFilepath, options.secretFilepath, isNonBlankString),
  )
  logger.debug('secretFilepath:', secretFilepath)

  // Resolve showAsterisk
  const showAsterisk: boolean = cover<boolean>(
    baseOptions.showAsterisk,
    convertToBoolean(options.showAsterisk),
  )
  logger.debug('showAsterisk:', showAsterisk)

  const resolvedOptions: IGlobalCommandOptions = {
    cryptRootDir,
    encoding,
    maxPasswordLength,
    maxRetryTimes,
    minPasswordLength,
    plainRootDir,
    secretFilepath,
    showAsterisk,
  }

  return { ...baseOptions, ...resolvedOptions }
}
