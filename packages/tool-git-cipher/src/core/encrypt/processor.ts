import type { ICipher } from '@guanghechen/helper-cipher'
import { AesCipherFactory, CipherCatalog, FileCipher } from '@guanghechen/helper-cipher'
import { createCommitAll } from '@guanghechen/helper-commander'
import { collectAllFilesSync, emptyDir } from '@guanghechen/helper-fs'
import invariant from '@guanghechen/invariant'
import commandExists from 'command-exists'
import { execa } from 'execa'
import inquirer from 'inquirer'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { logger } from '../../env/logger'
import { SecretMaster } from '../../util/secret'
import type { IGitCipherEncryptContext } from './context'

export class GitCipherEncryptProcessor {
  protected readonly context: IGitCipherEncryptContext
  protected readonly secretMaster: SecretMaster

  constructor(context: IGitCipherEncryptContext) {
    this.context = context
    this.secretMaster = new SecretMaster({
      cipherFactory: new AesCipherFactory(),
      secretFileEncoding: context.encoding,
      secretContentEncoding: 'hex',
      showAsterisk: context.showAsterisk,
      minPasswordLength: context.minPasswordLength,
      maxPasswordLength: context.maxPasswordLength,
    })
  }

  public async encrypt(): Promise<void> {
    const hasGitInstalled: boolean = commandExists.sync('git')
    invariant(hasGitInstalled, '[processor.encrypt] Cannot find git, have you installed it?')

    const { context, secretMaster } = this
    logger.debug('context:', context)

    await secretMaster.load(context.secretFilepath)

    const cipher: ICipher | null = secretMaster.cipher
    invariant(cipher != null, '[processor.encrypt] Secret cipher is not available!')

    const fileCipher = new FileCipher({ cipher, logger })
    const catalog = new CipherCatalog({
      fileCipher,
      sourceRootDir: context.plaintextRootDir,
      targetRootDir: context.ciphertextRootDir,
      maxTargetFileSize: context.maxTargetFileSize,
    })

    let commitMessage = ''

    try {
      // fetch from remote source repository
      if (context.updateBeforeEncrypt) {
        await this.fetchFromRemote()
      }

      if (context.full) {
        // full quantity update
        await this.fullQuantityUpdate(catalog)
        commitMessage = 'feat: full quantity update'
      } else {
        // incremental update
        await this.incrementalUpdate(catalog)
        commitMessage = 'feat: incremental update'
      }
    } finally {
      // Sync catalog.
      catalog.touch()
      await catalog.save(context.indexFilepath)

      // Perform cleanup operations.
      cipher.cleanup()
    }

    // do commit
    await createCommitAll(
      {
        stdio: 'inherit',
        cwd: context.workspace,
      },
      commitMessage + ` -- ${new Date().toISOString()}`,
    )
  }

  /**
   * Incremental update
   */
  public async incrementalUpdate(catalog: CipherCatalog): Promise<void> {
    const { context } = this

    // Load from or Create a catalog index file.
    if (existsSync(context.indexFilepath)) {
      await catalog.loadFromFile(context.indexFilepath)
    } else {
      await catalog.save(context.indexFilepath)
    }

    // Remove files that deleted
    catalog.cleanup()

    // Encrypt modified files only.
    const modifiedFilepaths: string[] = context.sensitiveDirectories
      .map(dirName =>
        collectAllFilesSync(path.join(context.plaintextRootDir, dirName), (p, stat) =>
          catalog.isModified(p, stat),
        ),
      )
      .flat()
    await this.encryptFiles(catalog, modifiedFilepaths)
  }

  /**
   * Full quantity update
   */
  public async fullQuantityUpdate(catalog: CipherCatalog): Promise<void> {
    const { context } = this

    // Empty ciphertextRootDir and index file.
    const { shouldEmptyOutDir } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'shouldEmptyOutDir',
        default: false,
        message: `Empty ${context.ciphertextRootDir}`,
      },
    ])
    if (shouldEmptyOutDir) {
      logger.info('Emptying {}...', context.ciphertextRootDir)
      await emptyDir(context.ciphertextRootDir)
    }

    // Reset catalog.
    catalog.reset()
    await catalog.save(context.indexFilepath)

    // Encrypt all files.
    const modifiedFilepaths: string[] = context.sensitiveDirectories
      .map(dirName => collectAllFilesSync(path.join(context.plaintextRootDir, dirName)))
      .flat()
    await this.encryptFiles(catalog, modifiedFilepaths)
  }

  /**
   * Encrypt specified files
   *
   * @param catalog
   * @param plaintextFilepaths
   */
  protected async encryptFiles(
    catalog: CipherCatalog,
    plaintextFilepaths: string[],
  ): Promise<void> {
    for (const filepath of plaintextFilepaths) {
      logger.debug('encrypt file:', filepath)
      await catalog.register(filepath)
    }
  }

  /**
   * Fetch all branches from all remotes
   */
  protected async fetchFromRemote(): Promise<void> {
    const { context } = this

    await execa('git', ['fetch', '--all'], {
      stdio: 'inherit',
      cwd: context.plaintextRootDir,
    })
  }
}
