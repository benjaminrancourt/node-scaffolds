/**
 * An part item of file.
 */
export interface FilePartItem {
  /**
   * Sequence no of a part.
   */
  sid: number
  /**
   * Start position of a part in sourcefile.
   */
  start: number
  /**
   * End position of a part in sourcefile.
   */
  end: number
}
