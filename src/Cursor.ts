/**
 * @license BSD 2-Clause License
 * Copyright (c) 2025, Jeff Hlywa (jhlywa@gmail.com)
 * Refactored by Jeff Lowery (jlowery2663@gmail.com)
 * See the LICENSE file for the full text, including disclaimer.
 */

import { parse } from './pgn'
import { Game } from './Game'

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

    try {
      const gameIndex = this.gameIndices[index]
      const gamePgn = this.pgn.substring(
        gameIndex.startOffset,
        gameIndex.endOffset,
      )

      // Parse PGN to Game
      const game = this.parsePgnToGame(gamePgn)

      // Manage cache
      if (this.cache.size >= this.options.cacheSize) {
        this.evictOldest()
      }
      this.cache.set(index, game)

      return game
    } catch (error) {
      const err = error as Error
      this.errors.push({ index, error: err })

      if (this.options.strict) {
        throw err
      }

      this.options.onError(err, index)
      return null
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

  private parsePgnToGame(pgn: string): Game {
    const {headers, root, result} = parse(pgn)

    console.log({result})

    return new Game(headers, root)
  }
}

/**
 * Phase 1: Index game boundaries in a multi-game PGN file
 */
export function indexPgnGames(pgn: string): GameIndex[] {
  const indices: GameIndex[] = []
  const lines = pgn.split('\n')
  let currentGameStart = -1
  let inGame = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // Detect game start (header line)
    if (line.startsWith('[Event ')) {
      if (inGame && currentGameStart >= 0) {
        // Previous game ended
        indices.push({
          startOffset: currentGameStart,
          endOffset: getLineOffset(pgn, i - 1),
        })
      }
      currentGameStart = getLineOffset(pgn, i)
      inGame = true
    }
  }

  // Add final game
  if (inGame && currentGameStart >= 0) {
    indices.push({
      startOffset: currentGameStart,
      endOffset: pgn.length,
    })
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
