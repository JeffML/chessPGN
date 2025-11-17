# Advanced Features

This document describes advanced features in chessPGN including the common
interface, PGN loading, and the multi-game cursor.

## Table of Contents

- [IChessGame Interface](#ichessgame-interface)
- [loadPgn() Method](#loadpgn-method)
- [Cursor for Multi-Game PGN Files](#cursor-for-multi-game-pgn-files)

---

## IChessGame Interface

The `IChessGame` interface defines the common API contract shared between
`ChessPGN` (the [chess.js](https://github.com/jhlywa/chess.js) compatible
wrapper class ) and `Game` (the core implementation class). This interface
enables polymorphic usage of both classes and provides type safety when writing
code that works with either implementation.

### Purpose

- **Type Safety**: Ensures both `ChessPGN` and `Game` implement the same core
  methods
- **Polymorphism**: Write functions that accept either class implementation
- **API Consistency**: Guarantees consistent behavior across implementations

### Available Methods

#### Position Manipulation

```typescript
interface IChessGame {
  // Load a position from FEN notation
  load(
    fen: string,
    options?: {
      skipValidation?: boolean
      preserveHeaders?: boolean
    },
  ): void

  // Get the FEN string for the current position
  fen(options?: { forceEnpassantSquare?: boolean }): string

  // Reset the game to the starting position
  reset(preserveHeaders?: boolean): void
}
```

#### Board Queries

```typescript
interface IChessGame {
  // Get the piece at a specific square
  get(square: Square): Piece | undefined

  // Find all squares containing a specific piece
  findPiece(piece: Piece): Square[]

  // Get a 2D array representation of the board
  board(): ({ square: Square; type: PieceSymbol; color: Color } | null)[][]
}
```

#### Move Operations

```typescript
interface IChessGame {
  // Make a move on the board
  move(
    move: string | { from: string; to: string; promotion?: string } | null,
    options?: { strict?: boolean },
  ): Move

  // Undo the last move
  undo(): Move | null

  // Get move history
  history(): string[]
  history(options: { verbose: true }): Move[]
  history(options: { verbose: false }): string[]
  history(options: { verbose: boolean }): string[] | Move[]
}
```

#### Game State Queries

```typescript
interface IChessGame {
  isCheck(): boolean
  isCheckmate(): boolean
  isStalemate(): boolean
  isDraw(): boolean
  isGameOver(): boolean
}
```

#### Headers and Comments

```typescript
interface IChessGame {
  // Header manipulation
  setHeader(key: string, value: string): Record<string, string>
  getHeaders(): Record<string, string>
  removeHeader(key: string): boolean

  // Comment manipulation
  getComment(fen?: string): string | undefined
  setComment(comment: string, fen?: string): void
  removeComment(fen?: string): string | undefined

  // Bulk comment operations
  getComments(): { fen: string; comment?: string; suffixAnnotation?: string }[]
  removeComments(): { fen: string; comment: string }[]

  // Suffix annotations (!!, !, !?, ?!, ?, ??)
  getSuffixAnnotation(fen?: string): Suffix | undefined
  setSuffixAnnotation(suffix: Suffix, fen?: string): void
  removeSuffixAnnotation(fen?: string): Suffix | undefined
}
```

#### PGN Operations

```typescript
interface IChessGame {
  pgn(options?: { newline?: string; maxWidth?: number }): string
}
```

### Usage Example

```typescript
import { ChessPGN, Game, IChessGame } from 'chessPGN'

// Function that works with any IChessGame implementation
function playOpening(game: IChessGame): string {
  game.move('e4')
  game.move('e5')
  game.move('Nf3')
  game.move('Nc6')
  return game.fen()
}

// Works with ChessPGN
const chess = new ChessPGN()
const chessFen = playOpening(chess)

// Works with Game
const game = new Game()
const gameFen = playOpening(game)

// Both produce the same result
console.log(chessFen === gameFen) // true
```

### Additional Examples

#### Working with Headers

```typescript
function analyzeGame(game: IChessGame) {
  // Add headers
  game.setHeader('Event', 'World Championship')
  game.setHeader('White', 'Carlsen')
  game.setHeader('Black', 'Nepomniachtchi')

  // Get all headers
  const headers = game.getHeaders()
  console.log(headers)

  // Remove a header
  const removed = game.removeHeader('Black')
  console.log(removed) // true
}
```

#### Working with Move History

```typescript
function printHistory(game: IChessGame) {
  game.move('e4')
  game.move('e5')
  game.move('Nf3')
  game.move('Nc6')

  // Get history as SAN strings
  const sanMoves = game.history()
  console.log(sanMoves) // ['e4', 'e5', 'Nf3', 'Nc6']

  // Get verbose history with full move details
  const verboseMoves = game.history({ verbose: true })
  verboseMoves.forEach((move) => {
    console.log(`${move.from} -> ${move.to}`)
    console.log(`  Piece: ${move.piece}`)
    console.log(`  Captured: ${move.captured || 'none'}`)
  })
}
```

#### Working with Comments and Annotations

```typescript
function annotateGame(game: IChessGame) {
  game.move('e4')
  game.setComment('The most popular opening move')
  game.setSuffixAnnotation('!!') // Brilliant move

  game.move('e5')
  game.setComment('Symmetric response')

  // Get all comments
  const comments = game.getComments()
  comments.forEach((entry) => {
    console.log(`Position: ${entry.fen}`)
    console.log(`Comment: ${entry.comment}`)
    console.log(`Annotation: ${entry.suffixAnnotation}`)
  })

  // Remove all comments
  const removed = game.removeComments()
  console.log(`Removed ${removed.length} comments`)
}
```

### Notes

- Some methods like `hash()`, `setCastlingRights()`, and `getCastlingRights()`
  are **ChessPGN-specific** and not part of the interface
- Both classes have been verified to produce identical results for all interface
  methods through extensive parity testing

### Implementation Details

The `ChessPGN` class is a legacy wrapper around the `Game` class. Most methods
in `ChessPGN` delegate directly to the underlying `Game` instance, maintaining
backward compatibility while reducing code duplication. This delegation pattern
ensures:

- **Consistent Behavior**: Both classes produce identical results for all
  interface methods
- **Single Source of Truth**: Core logic lives in `Game`, reducing maintenance
  burden
- **Verified Parity**: Comprehensive parity tests run across 469 real games to
  ensure identical behavior

When in doubt, either class can be used interchangeably for standard chess
operations. Use `ChessPGN` if you need hash tracking or explicit castling rights
manipulation.

---

## loadPgn() Method

The `loadPgn()` method loads a game from a PGN (Portable Game Notation) string.
This method parses the PGN headers and moves, setting up the game state
accordingly.

### Signature

```typescript
loadPgn(
  pgn: string,
  options?: {
    strict?: boolean
    newlineChar?: string
  }
): void
```

### Parameters

| Parameter             | Type      | Default    | Description                      |
| --------------------- | --------- | ---------- | -------------------------------- |
| `pgn`                 | `string`  | (required) | PGN string to parse              |
| `options.strict`      | `boolean` | `false`    | Enable strict PGN parsing mode   |
| `options.newlineChar` | `string`  | `'\r?\n'`  | Custom newline character pattern |

### Behavior

#### Permissive Mode (default, `strict: false`)

- Attempts to parse non-standard PGN formats
- Accepts FEN tags regardless of case (e.g., "fen", "FEN", "Fen")
- Loads custom starting positions even without a `[SetUp "1"]` tag
- Accepts various algebraic notation formats:
  - Standard algebraic notation (SAN): `e4`, `Nf3`, `O-O`
  - Long algebraic notation: `e2e4`, `Ng1f3`
  - Notation with hyphens: `e2-e4`
  - Piece capture without 'x': `Nf6` instead of `Nxf6`

#### Strict Mode (`strict: true`)

- Enforces PGN specification compliance
- Requires `[SetUp "1"]` tag when using custom starting positions
- Requires `[FEN "..."]` tag when `SetUp` is present
- Only accepts standard algebraic notation
- Throws errors on invalid moves or malformed PGN

### Examples

#### Basic Usage

```typescript
import { ChessPGN } from 'chessPGN'

const chess = new ChessPGN()
const pgn = `[Event "Casual Game"]
[Site "New York"]
[Date "2025.01.15"]
[White "Alice"]
[Black "Bob"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 1-0`

chess.loadPgn(pgn)
console.log(chess.getHeaders())
// { Event: 'Casual Game', Site: 'New York', ... }
console.log(chess.fen())
// Position after the last move
```

#### Loading Custom Starting Position

```typescript
const chess = new ChessPGN()
const pgn = `[SetUp "1"]
[FEN "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2"]

2. Nf3 Nc6`

chess.loadPgn(pgn, { strict: true })
```

#### Handling Custom Newlines

```typescript
// PGN with Windows-style line endings
const pgnWithCRLF = '...' // PGN with \r\n
chess.loadPgn(pgnWithCRLF, { newlineChar: '\r\n' })
```

#### Error Handling

```typescript
try {
  chess.loadPgn(invalidPgn, { strict: true })
} catch (error) {
  console.error('Invalid PGN:', error.message)
}
```

### Common Use Cases

1. **Loading Game Archives**: Parse games from PGN databases
2. **Game Analysis**: Load specific games for study
3. **Tournament Records**: Import games with complete metadata
4. **Position Setup**: Start from non-standard positions with FEN

### Related Methods

- `pgn()` - Export the current game as a PGN string
- `load()` - Load a position from FEN notation
- `reset()` - Reset to starting position
- `getHeaders()` - Retrieve PGN header tags

---

## Cursor for Multi-Game PGN Files

The `Cursor` class provides efficient iteration over large PGN files containing
multiple games. It supports lazy parsing, caching, error handling, and optional
worker thread parallelization.

### Why Use Cursor?

- **Memory Efficient**: Parses games on-demand instead of loading entire file
- **Fast**: Optional worker thread support for parallel parsing (3-5x speedup)
- **Error Tolerant**: Continue processing even when individual games fail to
  parse
- **Flexible Navigation**: Forward/backward iteration and seeking
- **Async Support**: Implements async iteration protocol

### Creating a Cursor

#### From PGN String

```typescript
import { indexPgnGames } from 'chessPGN'

const pgnFile = `
[Event "Game 1"]
...
1. e4 e5

[Event "Game 2"]
...
1. d4 d5
`

const cursor = indexPgnGames(pgnFile, {
  start: 0, // Start at first game (default)
  length: 10, // Load 10 games (default: all)
  workers: true, // Enable worker threads (default: false)
  workerBatchSize: 5, // Games per batch (default: 10)
  strict: false, // Permissive parsing (default)
  onError: (err, idx) => console.error(`Game ${idx}: ${err.message}`),
})
```

#### From File

```typescript
import * as fs from 'fs'

const pgnContent = fs.readFileSync('games.pgn', 'utf8')
const cursor = indexPgnGames(pgnContent, { workers: 4 }) // Use 4 workers
```

### Cursor Options

```typescript
interface CursorOptions {
  start?: number // Starting game index (default: 0)
  length?: number // Number of games to load (default: all)
  prefetch?: number // Games to prefetch (default: 1)
  includeMetadata?: boolean // Load headers/comments (default: true)
  cacheSize?: number // Max games in memory (default: 10)
  lazyParse?: boolean // Parse on access (default: true)
  strict?: boolean // Strict parsing (default: false)
  workers?: boolean | number // Enable workers (default: false)
  workerBatchSize?: number // Games per batch (default: 10)
  onError?: (error: Error, gameIndex: number) => void
}
```

### Basic Iteration

#### Synchronous Iteration

```typescript
const cursor = indexPgnGames(pgnFile)

while (cursor.hasNext()) {
  const game = cursor.next()
  if (game) {
    console.log(game.getHeaders())
    console.log(game.fen())
  }
}

console.log(`Processed ${cursor.position} games`)
console.log(`Errors: ${cursor.errors.length}`)
```

#### Async Iteration (with Workers)

```typescript
const cursor = indexPgnGames(pgnFile, { workers: true })

for await (const game of cursor) {
  console.log(game.getHeaders()['Event'])
  console.log(game.fen())
}

// Clean up worker threads
await cursor.terminate()
```

### Advanced Navigation

#### Backward Iteration

```typescript
// Move forward
cursor.next()
cursor.next()
cursor.next()

// Move backward
if (cursor.hasBefore()) {
  const previousGame = cursor.before()
}
```

#### Seeking

```typescript
// Jump to specific game
cursor.seek(42)
const game = cursor.next() // Game #42

// Reset to beginning
cursor.reset()
```

#### Filtering

```typescript
// Find next game matching criteria
const whiteWins = cursor.findNext((headers) => {
  return headers['Result'] === '1-0' && headers['White'] === 'Carlsen, Magnus'
})
```

### Performance Optimization

#### Worker Thread Usage

Worker threads provide significant speedup for large files:

```typescript
// Standard parsing
const cursor1 = indexPgnGames(largePgn) // ~48ms per game

// With 4 worker threads
const cursor2 = indexPgnGames(largePgn, { workers: 4 }) // ~15ms per game

// Benchmark showed 3.3x speedup on 469-game file
```

**Best Practices:**

- Use workers for files with 50+ games
- Optimal worker count: 2-6 (depends on CPU cores)
- Adjust `workerBatchSize` based on game complexity (5-10 typical)
- Always call `terminate()` when done with cursor

#### Caching Strategy

```typescript
const cursor = indexPgnGames(pgnFile, {
  cacheSize: 20, // Keep 20 games in memory
  prefetch: 3, // Prefetch next 3 games
  lazyParse: true, // Parse only when accessed
})
```

### Error Handling

#### Per-Game Error Handling

```typescript
const cursor = indexPgnGames(pgnFile, {
  strict: false, // Continue on errors
  onError: (error, gameIndex) => {
    console.error(`Game ${gameIndex} failed: ${error.message}`)
    // Log to file, send to monitoring, etc.
  },
})

// After iteration, check errors
console.log(`Total errors: ${cursor.errors.length}`)
cursor.errors.forEach(({ index, error }) => {
  console.log(`Game ${index}: ${error.message}`)
})
```

#### Strict Mode

```typescript
const cursor = indexPgnGames(pgnFile, {
  strict: true, // Throw on first error
})

try {
  while (cursor.hasNext()) {
    const game = cursor.next()
    // Process game
  }
} catch (error) {
  console.error('Parsing failed:', error)
}
```

### Complete Example

```typescript
import * as fs from 'fs'
import { indexPgnGames } from 'chessPGN'

async function analyzeGames(filename: string) {
  const pgn = fs.readFileSync(filename, 'utf8')

  const cursor = indexPgnGames(pgn, {
    workers: 4,
    workerBatchSize: 8,
    onError: (err, idx) => console.error(`Game ${idx}: ${err}`),
  })

  let whiteWins = 0
  let blackWins = 0
  let draws = 0

  for await (const game of cursor) {
    const headers = game.getHeaders()
    const result = headers['Result']

    if (result === '1-0') whiteWins++
    else if (result === '0-1') blackWins++
    else if (result === '1/2-1/2') draws++

    // Analyze final position
    if (game.isCheckmate()) {
      console.log(`Checkmate in game: ${headers['Event']}`)
    }
  }

  console.log(`Statistics:`)
  console.log(`  White wins: ${whiteWins}`)
  console.log(`  Black wins: ${blackWins}`)
  console.log(`  Draws: ${draws}`)
  console.log(`  Total: ${cursor.position}`)
  console.log(`  Errors: ${cursor.errors.length}`)

  await cursor.terminate() // Clean up workers
}

analyzeGames('world_championship_2025.pgn')
```

### Cursor API Reference

```typescript
interface Cursor {
  // Core navigation
  next(): Game | null
  hasNext(): boolean

  // Backward navigation
  before(): Game | null
  hasBefore(): boolean

  // Position tracking
  position: number
  totalGames?: number

  // Seeking
  seek(index: number): boolean
  reset(): void

  // Filtering
  findNext(predicate: (headers: Record<string, string>) => boolean): Game | null

  // Error tracking
  errors: Array<{ index: number; error: Error }>

  // Async iteration
  [Symbol.asyncIterator](): AsyncIterableIterator<Game>

  // Cleanup (when using workers)
  terminate(): Promise<void>
}
```

### Performance Tips

1. **Use Workers for Large Files**: Files with 50+ games benefit significantly
2. **Adjust Batch Size**: Larger batches (10-15) for simple games, smaller (5-8)
   for complex games
3. **Enable Caching**: Set `cacheSize` based on available memory
4. **Lazy Parsing**: Keep `lazyParse: true` unless you need immediate parsing
5. **Error Tolerance**: Use `strict: false` for large archives with potentially
   malformed games

### Related Documentation

- [PGN Specification](http://www.saremba.de/chessgml/standards/pgn/pgn-complete.htm)
- [Worker Thread Performance](./WORKERS.md)
- [API Documentation](https://jeffml.github.io/chessPGN)
