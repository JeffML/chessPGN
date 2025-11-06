/**
 * @license BSD 2-Clause License
 * Copyright (c) 2025, Jeff Hlywa (jhlywa@gmail.com)
 * Refactored by Jeff Lowery (jlowery2663@gmail.com)
 * See the LICENSE file for the full text, including disclaimer.
 */

import { Game } from './Game'
import { processPgnToGame } from './pgnProcessor'
import { parse } from './pgn'

/**
 * Options for configuring a cursor over multi-game PGN files
 */
export interface CursorOptions {
  start?: number // Starting game index (default: 0)
  length?: number // Number of games to load (default: all)
  prefetch?: number // Number of games to prefetch (default: 1)
  includeMetadata?: boolean // Load headers/comments (default: true)
  cacheSize?: number // Max games in memory (default: 10)
  lazyParse?: boolean // Parse moves only when accessed (default: true)
  strict?: boolean // Throw on first error (default: false)
  onError?: (error: Error, gameIndex: number) => void
}

/**
 * Game boundary index created during Phase 1 parsing
 */
interface GameIndex {
  startOffset: number
  endOffset: number
  headers?: Record<string, string>
}

/**
 * Cursor for iterating over games in a multi-game PGN file
 */
export interface Cursor {
  // Core navigation
  next(): Game | null
  hasNext(): boolean

  // Optional backward navigation (Phase 2)
  before?(): Game | null
  hasBefore?(): boolean

  // Position tracking
  position: number
  totalGames?: number

  // Navigation (Phase 2)
  seek?(index: number): boolean
  reset?(): void

  // Filtering (Phase 2)
  findNext?(
    predicate: (headers: Record<string, string>) => boolean,
  ): Game | null

  // Error tracking
  errors: Array<{ index: number; error: Error }>

  // Async iteration support (Phase 3)
  [Symbol.asyncIterator]?(): AsyncIterableIterator<Game>
}

/**
 * Implementation of Cursor for multi-game PGN files
 */
export class CursorImpl implements Cursor {
  private pgn: string
  private gameIndices: GameIndex[]
  private currentPosition: number
  private cache: Map<number, Game>
  private options: Required<CursorOptions>
  public errors: Array<{ index: number; error: Error }> = []

  constructor(pgn: string, indices: GameIndex[], options: CursorOptions = {}) {
    this.pgn = pgn
    this.gameIndices = indices
    this.currentPosition = options.start || 0
    this.cache = new Map()

    // Set defaults
    this.options = {
      start: options.start || 0,
      length: options.length || indices.length,
      prefetch: options.prefetch || 1,
      includeMetadata: options.includeMetadata !== false,
      cacheSize: options.cacheSize || 10,
      lazyParse: options.lazyParse !== false,
      strict: options.strict || false,
      onError: options.onError || (() => {}),
    }
  }

  get position(): number {
    return this.currentPosition
  }

  get totalGames(): number {
    return this.gameIndices.length
  }

  hasNext(): boolean {
    const maxPosition = this.options.start + this.options.length
    return (
      this.currentPosition < maxPosition &&
      this.currentPosition < this.gameIndices.length
    )
  }

  next(): Game | null {
    if (!this.hasNext()) {
      return null
    }

    const game = this.parseGame(this.currentPosition)
    this.currentPosition++

    // Prefetch next games if enabled
    if (this.options.prefetch > 0) {
      this.prefetchGames()
    }

    return game
  }

  // Phase 2: Backward navigation
  hasBefore(): boolean {
    return this.currentPosition > this.options.start
  }

  before(): Game | null {
    if (!this.hasBefore()) {
      return null
    }

    this.currentPosition--
    return this.parseGame(this.currentPosition)
  }

  // Phase 2: Seeking
  seek(index: number): boolean {
    if (index < 0 || index >= this.gameIndices.length) {
      return false
    }
    this.currentPosition = index
    return true
  }

  reset(): void {
    this.currentPosition = this.options.start
    this.cache.clear()
  }

  // Phase 2: Filtering
  findNext(
    predicate: (headers: Record<string, string>) => boolean,
  ): Game | null {
    while (this.hasNext()) {
    const index = this.gameIndices[this.currentPosition]
      if (index.headers && predicate(index.headers)) {
        return this.next()
      }
      this.currentPosition++
    }
    return null
  }

  // Phase 3: Async iteration
  async *[Symbol.asyncIterator](): AsyncIterableIterator<Game> {
    while (this.hasNext()) {
      const game = this.next()
      if (game) {
        yield game
      }
    }
  }

  // Private helper methods
  private parseGame(index: number): Game | null {
    // Check cache first
    if (this.cache.has(index)) {
      return this.cache.get(index)!
    }

    const gameIndex = this.gameIndices[index]
    const gamePgn = this.pgn.substring(gameIndex.startOffset, gameIndex.endOffset)

    try {
      // Try the normal parsing path first
      const game = processPgnToGame(gamePgn, { strict: this.options.strict })

      // Manage cache
      if (this.cache.size >= this.options.cacheSize) {
        this.evictOldest()
      }
      this.cache.set(index, game)

      return game
    } catch (error) {
      const err = error as Error
    // Record the original error
    this.errors.push({ index, error: err })

  /*
   * Fallback rationale: the Peggy-generated parser (used by
   * `processPgnToGame`) rejects certain tag-pair header values that
   * contain backslash-escaped quotes (e.g. `[Annotator "O\\"Connor"]`).
   * However, `indexPgnGames` extracts headers using a permissive
   * scanner and already provides the correct header values. To avoid
   * losing the game entirely when the full-blob parse fails, we parse
   * only the moves section by prepending a safe dummy tag-pair and
   * then construct a `Game` with the headers we previously indexed.
   * This keeps behavior correct for consumers while avoiding wholesale
   * parser rewrites; both the original and any fallback errors are
   * recorded in `this.errors`.
   */
    /*
     * Attempt a fallback when we have pre-parsed headers for this index.
     */
      try {
  const m = gamePgn.match(/\r?\n\s*\r?\n/)
  const movesOnly = m && m.index !== undefined ? gamePgn.substring(m.index + m[0].length) : ''
  const safe = `[Event "_"]\n\n${movesOnly}`
        const parsed = parse(safe)
        const game = new Game(gameIndex.headers || {}, parsed.root)

        if (this.cache.size >= this.options.cacheSize) {
          this.evictOldest()
        }
        this.cache.set(index, game)

        return game
      } catch (fallbackErr) {
        const fErr = fallbackErr as Error
        this.errors.push({ index, error: fErr })
        if (this.options.strict) {
          throw fErr
        }
        this.options.onError(fErr, index)
        return null
      }
    }
  }

  private prefetchGames(): void {
    for (let i = 1; i <= this.options.prefetch; i++) {
      const prefetchIndex = this.currentPosition + i
      if (
        prefetchIndex < this.gameIndices.length &&
        !this.cache.has(prefetchIndex)
      ) {
        this.parseGame(prefetchIndex)
      }
    }
  }

  private evictOldest(): void {
    const oldestKey = this.cache.keys().next().value
    if (oldestKey !== undefined) {
      this.cache.delete(oldestKey)
    }
  }
}

/**
 * Phase 1: Index game boundaries in a multi-game PGN file
 */
export function indexPgnGames(pgn: string): GameIndex[] {
  const indices: GameIndex[] = []
  const lines = pgn.split('\n')
  // trackers removed — we use the indices array to manage start/end offsets

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // Detect game start when we encounter any tag-pair line like: [Key "Value"]
    if (line.startsWith('[')) {
      const prev = i > 0 ? lines[i - 1].trim() : ''
  /*
   * Only treat the first tag line after a blank (or start of file) as the
   * start of a header block. This avoids creating one entry per tag-line.
   */
      if (prev !== '') {
        continue
      }

      const startOffset = getLineOffset(pgn, i)

      // If the last index entry was created without an endOffset, close it
      if (indices.length > 0 && indices[indices.length - 1].endOffset === 0) {
        indices[indices.length - 1].endOffset = startOffset
      }

  /**
   * Parse headers for this game by scanning forward until a blank line.
   * Accept escaped quotes inside the value (e.g. [Site "My \"Home\""])
   */
      const headers: Record<string, string> = {}
      // Parse header lines more permissively to handle unusual escaping
      for (let j = i; j < lines.length; j++) {
        const ln = lines[j].trim()
        if (ln === '') break
        if (!ln.startsWith('[')) break

        // Extract tag name
        const nameMatch = ln.match(/^\[([A-Za-z0-9_]+)\s+/)
        if (!nameMatch) continue
        const key = nameMatch[1]

        // Find the opening quote for the value
        const firstQuote = ln.indexOf('"', nameMatch[0].length)
        if (firstQuote === -1) continue

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
        if (closed === -1) continue

        // Ensure the line ends with a closing bracket after the value
        const after = ln.substring(closed + 1).trim()
        if (!after.startsWith(']')) continue

        const raw = ln.substring(firstQuote + 1, closed)
        // Unescape backslashes first, then escaped quotes
        const value = raw.replace(/\\\\/g, '\\').replace(/\\"/g, '"')
        headers[key] = value
      }

      // Push a partial entry with endOffset=0; will be finalized when next game is found
  indices.push({ startOffset, endOffset: 0, headers })
    }
  }

  // Finalize any trailing partial entry
  if (indices.length > 0 && indices[indices.length - 1].endOffset === 0) {
    indices[indices.length - 1].endOffset = pgn.length
  }

  return indices
}

function getLineOffset(pgn: string, lineNumber: number): number {
  const lines = pgn.split('\n')
  let offset = 0
  for (let i = 0; i < lineNumber && i < lines.length; i++) {
    offset += lines[i].length + 1 // +1 for newline
  }
  return offset
}
