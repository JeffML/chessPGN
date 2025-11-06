/**
 * Small helpers for rendering PGN output (headers + moves formatting helpers)
 */
export function renderHeaders(
  headers: Record<string, string | null>,
  newline = '\n',
): { lines: string[]; headerExists: boolean } {
  const lines: string[] = []
  /*
   * Keep the original behavior which treats presence of header keys as
   * indication that headers exist (HEADER_TEMPLATE ensures keys are present).
   */
  const headerExists = Object.keys(headers).length > 0

  for (const key in headers) {
    const value = headers[key]
    if (value) {
      lines.push(`[${key} "${value}"]` + newline)
    }
  }

  return { lines, headerExists }
}

export default renderHeaders
