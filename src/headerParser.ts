/**
 * Small helper utilities to parse PGN tag-pair header lines.
 * We keep this permissive: it finds the quoted value by locating an
 * unescaped closing quote and unescapes backslashes and escaped quotes.
 */
export function parseTagPairLine(
  line: string,
): { key: string; value: string } | null {
  const ln = line.trim()
  if (!ln.startsWith('[')) return null

  const nameMatch = ln.match(/^\[([A-Za-z0-9_]+)\s+/)
  if (!nameMatch) return null
  const key = nameMatch[1]

  const firstQuote = ln.indexOf('"', nameMatch[0].length)
  if (firstQuote === -1) return null

  // Find the matching closing quote, skipping escaped quotes
  let k = firstQuote + 1
  let closed = -1
  while (k < ln.length) {
    if (ln[k] === '"') {
      // count preceding backslashes
      let bs = 0
      let p = k - 1
      while (p >= 0 && ln[p] === '\\') {
        bs++
        p--
      }
      if (bs % 2 === 0) {
        closed = k
        break
      }
    }
    k++
  }
  if (closed === -1) return null

  const after = ln.substring(closed + 1).trim()
  if (!after.startsWith(']')) return null

  const raw = ln.substring(firstQuote + 1, closed)

  // Simple unescaping: \\ becomes \ first, then \" becomes "
  const value = raw.replace(/\\\\/g, '\\').replace(/\\"/g, '"')

  return { key, value }
}

export function parseHeaders(
  lines: string[],
  startIndex: number,
): { headers: Record<string, string>; nextIndex: number } {
  const headers: Record<string, string> = {}
  for (let j = startIndex; j < lines.length; j++) {
    const ln = lines[j].trim()
    if (ln === '') return { headers, nextIndex: j }
    if (!ln.startsWith('[')) return { headers, nextIndex: j }

    const kv = parseTagPairLine(ln)
    if (kv) headers[kv.key] = kv.value
  }

  return { headers, nextIndex: lines.length }
}

export default { parseTagPairLine, parseHeaders }
