import {
  TextTransformerBuilder,
  cover,
  isNonBlankString,
  textTransformers,
} from '@guanghechen/option-helper'
import type { InputQuestion } from 'inquirer'
import path from 'path'
import {
  createPackageAuthorPrompt,
  createPackageDescriptionPrompt,
  createPackageLocationPrompt,
  createPackageNamePrompt,
  createPackageVersionPrompt,
} from './prompts'
import type {
  NpmPackageData,
  NpmPackagePreAnswers,
  NpmPackagePromptsAnswers,
} from './types'
import { detectMonorepo, resolveRepositoryName } from './util'

// Transformers for npm-package prompts
export const npmPackageTransformers = {
  packageName: textTransformers.trim,
  packageAuthor: textTransformers.trim,
  packageVersion: textTransformers.trim,
  packageDescription: new TextTransformerBuilder().trim.capital.build(),
  packageLocation: textTransformers.trim,
}

/**
 * Create a list of inquirer prompts for collecting a NpmPackagePromptsAnswers.
 *
 * @param cwd
 * @param preAnswers
 * @param defaultAnswers
 * @returns
 */
export function createNpmPackagePrompts(
  preAnswers: NpmPackagePreAnswers,
  defaultAnswers: Partial<NpmPackagePromptsAnswers> = {},
): InputQuestion<NpmPackagePromptsAnswers> {
  const prompts: InputQuestion<NpmPackagePromptsAnswers> = [
    createPackageNamePrompt(
      defaultAnswers.packageName,
      npmPackageTransformers.packageName,
    ),
    createPackageAuthorPrompt(
      preAnswers.cwd,
      defaultAnswers.packageAuthor,
      npmPackageTransformers.packageAuthor,
    ),
    createPackageVersionPrompt(
      defaultAnswers.packageVersion,
      npmPackageTransformers.packageVersion,
    ),
    createPackageDescriptionPrompt(
      defaultAnswers.packageDescription,
      npmPackageTransformers.packageDescription,
    ),
    createPackageLocationPrompt(
      preAnswers.isMonorepo,
      defaultAnswers.packageLocation,
      npmPackageTransformers.packageLocation,
    ),
  ]
  return prompts
}

/**
 * Resolve pre-answers.
 *
 * @param cwd
 * @param preAnswers
 * @returns
 */
export function resolveNpmPackagePreAnswers(
  preAnswers: Partial<NpmPackagePreAnswers> = {},
): NpmPackagePreAnswers {
  const cwd: string = cover<string>(
    () => path.resolve(process.cwd()),
    preAnswers.cwd,
  )

  const isMonorepo: boolean = cover<boolean>(
    () => detectMonorepo(cwd),
    preAnswers.isMonorepo,
  )

  const result: NpmPackagePreAnswers = {
    cwd,
    isMonorepo,
  }
  return result
}

/**
 * Resolve answers.
 *
 * @param answers     Prompts answers
 * @param preAnswers  Pre calculated answers
 * @returns
 */
export function resolveNpmPackageAnswers(
  answers: NpmPackagePromptsAnswers,
  preAnswers: NpmPackagePreAnswers,
): NpmPackageData {
  const { cwd, isMonorepo } = preAnswers

  // Resolve prompts answers.
  const packageName: string = npmPackageTransformers.packageName(
    answers.packageName,
  )
  const packageAuthor: string = npmPackageTransformers.packageAuthor(
    answers.packageAuthor,
  )
  const packageVersion: string = npmPackageTransformers.packageVersion(
    answers.packageVersion,
  )
  const packageDescription: string = npmPackageTransformers
    .packageDescription(answers.packageDescription)
    .replace(/[.]?$/, '')
  const packageLocation: string = npmPackageTransformers.packageLocation(
    answers.packageLocation,
  )

  // Resolve additional data.
  const packageUsage: string = isNonBlankString(packageDescription)
    ? packageDescription + '.'
    : ''
  const repositoryName: string = resolveRepositoryName(isMonorepo, packageName)
  const repositoryHomepage: string = isMonorepo
    ? `https://github.com/${packageAuthor}/${repositoryName}/tree/master/${packageLocation}#readme`
    : `https://github.com/${packageAuthor}/${repositoryName}#readme`

  const result: NpmPackageData = {
    cwd,
    isMonorepo,
    packageName,
    packageAuthor,
    packageVersion,
    packageDescription,
    packageLocation,
    packageUsage,
    repositoryName,
    repositoryHomepage,
  }
  return result
}
