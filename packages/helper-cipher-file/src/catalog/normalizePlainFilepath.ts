import type { IWorkspacePathResolver } from '@guanghechen/path.types'

export function normalizePlainFilepath(
  plainFilepath: string,
  plainPathResolver: IWorkspacePathResolver,
): string {
  const relativePlainFilepath = plainPathResolver.relative(plainFilepath)
  return relativePlainFilepath.replace(/[/\\]+/g, '/')
}
