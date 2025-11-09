/**
 * @license BSD 2-Clause License
 * Copyright (c) 2025, Jeff Hlywa (jhlywa@gmail.com)
 * Refactored by Jeff Lowery (jlowery2663@gmail.com)
 * See the LICENSE file for the full text, including disclaimer.
 */

import { Game } from './Game'
import { processPgnToGame } from './pgnProcessor'
import { parse } from './pgn'
import { parseHeaders } from './headerParser'

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
  private _pgnSource: string
  private gameIndices: GameIndex[]
  private currentPosition: number
  private cache: Map<number, Game>
  private options: Required<CursorOptions>
  public errors: Array<{ index: number; error: Error }> = []
  public totalGames?: number

  constructor(pgn: string, indices: GameIndex[], options: CursorOptions = {}) {
    const defaults: Required<CursorOptions> = {
      start: 0,
      length: Infinity as unknown as number,
      prefetch: 1,
      includeMetadata: true,
      cacheSize: 10,
      lazyParse: true,
      strict: false,
      onError: () => {},
    }

    this._pgnSource = pgn
    this.gameIndices = indices
    this.options = { ...defaults, ...(options as CursorOptions) }
    this.currentPosition = this.options.start
    this.cache = new Map()
    this.totalGames = indices.length
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

  // Core navigation
  public next(): Game | null {
    if (!this.hasNext()) return null
    const idx = this.currentPosition
    const g = this.parseGame(idx)
    this.currentPosition++
    this.prefetchGames()
    return g
  }

  public hasNext(): boolean {
    const start = this.options.start
    const max = isFinite(this.options.length)
      ? start + this.options.length
      : this.gameIndices.length
    return this.currentPosition < Math.min(this.gameIndices.length, max)
  }

  // expose position as a property to match the Cursor interface
  public get position(): number {
    return this.currentPosition
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
    const gamePgn = this._pgnSource.substring(
      gameIndex.startOffset,
      gameIndex.endOffset,
    )

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
      const err = error as Error & { found?: unknown }
      // Record the original error
      this.errors.push({ index, error: err })
      /*
       * Only attempt a fallback when the parse error appears header-related
       * (PEG parser reports the unexpected character in `found`). If the
       * parser found a '[' where it expected a SAN/move, that's a strong
       * signal the headers contained problematic quoting. Otherwise,
       * rethrow or call onError depending on strict mode.
       */
      const found = err.found || null
      const msg = err.message || ''
      const looksLikeHeaderIssue =
        found === '[' ||
        String(msg).includes("'[' found") ||
        /\[/.test(String(found))

      if (!looksLikeHeaderIssue) {
        if (this.options.strict) throw err
        this.options.onError(err, index)
        return null
      }

      try {
        const m = gamePgn.match(/\r?\n\s*\r?\n/)
        const movesOnly =
          m && m.index !== undefined
            ? gamePgn.substring(m.index + m[0].length)
            : ''
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

  /**
   * Generate PGN string for all games in the cursor
   * @param options - Formatting options (newline character and max width)
   * @returns Combined PGN string of all games
   */
  pgn({
    newline = '\n',
    maxWidth = 0,
  }: { newline?: string; maxWidth?: number } = {}): string {
    const gamePgns: string[] = []

    /* Save current position */
    const savedPosition = this.currentPosition

    /* Reset to start and iterate through all games */
    this.reset()

    while (this.hasNext()) {
      const game = this.next()
      if (game) {
        gamePgns.push(game.pgn({ newline, maxWidth }))
      }
    }

    /* Restore position */
    this.currentPosition = savedPosition

    /* Join games with double newline separator */
    return gamePgns.join(newline + newline)
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

      const { headers, nextIndex } = parseHeaders(lines, i)
      /*
       * Advance outer loop to the last header line we consumed so we don't
       * re-scan header lines on the next iteration.
       */
      i = nextIndex - 1

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
