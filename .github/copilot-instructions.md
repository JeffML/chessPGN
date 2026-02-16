# Copilot Instructions for chessPGN

## Project Overview

chessPGN is a TypeScript chess library providing:

1. **IChessGame Interface** - chess.js compatible API for game manipulation
2. **Multi-Game PGN Parsing** - `indexPgnGames()` + `Cursor` for efficient
   iteration over large PGN files

The library maintains backward compatibility with chess.js while adding enhanced
PGN parsing capabilities with worker thread support.

## Architecture

### Core Classes

**Game** (`src/Game.ts`) - Primary implementation (2133 lines)

- Single source of truth for chess logic
- Implements full `IChessGame` interface
- All chess operations: moves, validation, game state

**ChessPGN** (`src/chessPGN.ts`) - Legacy wrapper

- Backward compatibility with chess.js
- Delegates all operations to `Game` instance
- Adds hash tracking and explicit castling methods
- **When modifying logic, edit `Game.ts` only**

**Cursor** (`src/Cursor.ts`) - Multi-game iteration

- Lazy parsing with optional worker threads
- Async iteration support
- Error tolerance and caching
- Performance: 3-5x speedup with workers
- **CRITICAL**: `indexPgnGames()` returns metadata objects, NOT `IChessGame` instances
  - Objects have shape: `{ startOffset: number, endOffset: number, headers: {...} }`
  - Access headers via `.headers` property, not `.header()` method
  - To get full `IChessGame` instance, must call `loadPgn()` separately
  - Use for metadata scanning when you don't need full game API
  - Example: `for await (const game of cursor) { const white = game.headers.White; }`

### Type System

All types in `src/types.ts`:

- `Square`, `Color`, `PieceSymbol`, `Piece`
- `Move` - Rich move metadata with flags
- `IChessGame` - Common interface
- Export types from types.ts, not implementation files

### PGN Parser

**Grammar**: `src/pgn.peggy` (Peggy parser generator)

- **NEVER manually edit `src/pgn.js`**
- Always modify `pgn.peggy` and run `npm run parser`
- Supports permissive and strict parsing modes

**Worker Implementation**: `src/workerParser.js`

- CommonJS module (not TypeScript)
- Parallel parsing for large files
- Usage: `indexPgnGames(pgn, { workers: 4 })`

## Documentation

### Source of Authority

**`docs/index.md`** - Master documentation

- Primary reference for all API features
- Source for generating `docs/index.html`
- Keep comprehensive and accurate

**`docs/index.html`** - Web documentation

- Generated from index.md content
- **Layout must be preserved**: TOC on left, content on right
- Only minor edits allowed to maintain structure
- When index.md changes, incorporate into HTML carefully

### Documentation Structure

```
docs/
  index.md      # Source of truth - edit freely
  index.html    # Generated view - preserve layout
```

### Key Documentation Sections

1. **IChessGame Interface** - Core API contract
2. **loadPgn() Method** - Single-game PGN loading
3. **Cursor for Multi-Game PGN Files** - Batch processing

## Development Workflows

### Pre-Commit Check (Required)

```bash
npm run check  # Runs: format check, lint, tests, build, API extractor
```

**This is the same check CI uses** - must pass before committing.

### Individual Commands

```bash
npm test              # Run all 527 tests
npm run format        # Auto-fix Prettier formatting
npm run lint          # ESLint check
npm run parser        # Regenerate PGN parser from peggy
npm run build         # Build CJS, ESM, and types
npm run api:check     # Verify no unintended API changes
npm run api:update    # Accept API changes
```

### Build Outputs

```
dist/
  cjs/chessPGN.js           # CommonJS bundle
  esm/chessPGN.js           # ES Module bundle
  types/chessPGN.d.ts       # TypeScript declarations
```

### API Surface Tracking

`@microsoft/api-extractor` tracks public API:

- `etc/chess-pgn.api.md` - API surface report
- Breaking changes require major version bump
- New features require minor version bump
- Run `npm run api:update` after API changes

## Testing Conventions

### Test Organization

Located in `__tests__/` directory:

- 527+ tests covering all functionality
- Test files named `*.test.ts`

### Critical Test Patterns

**Parity Tests** (`game-chessPgn-parity.test.ts`):

- Verify `ChessPGN` ≡ `Game` across 469 real games
- Run on 16 different API methods
- When adding `Game` methods, add corresponding `ChessPGN` wrapper and parity
  test

**Cursor Tests**:

- `cursor.wcup25.test.ts` - Real-world 469-game file
- `cursor.async.test.ts` - Worker thread testing
- `cursor.file.test.ts` - File-based parsing

### Test Naming

Use descriptive test names:

```typescript
test('should reject invalid FEN with wrong piece count', ...)
test('should handle underpromotion to rook', ...)
```

## Code Patterns

### FEN Handling

```typescript
// Full FEN includes turn, castling, en passant
'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

// Position-only (first field)
'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR'

// Extract position: fen.split(' ')[0]
```

### Move Representation

```typescript
// SAN (Standard Algebraic Notation)
"Nf3", "O-O", "e4"

// Long algebraic object
{ from: "e2", to: "e4", promotion: "q" }

// move() accepts both formats
```

### Worker Thread Pattern

```typescript
const cursor = indexPgnGames(pgnContent, {
  workers: 4, // Number of worker threads
  workerBatchSize: 10, // Games per batch
  onError: (err, idx) => console.error(`Game ${idx}: ${err}`),
})

// Always cleanup
await cursor.terminate()
```

## File Organization

```
src/
  chessPGN.ts           # Legacy API wrapper
  Game.ts               # Core implementation (2133 lines)
  types.ts              # All type definitions
  Cursor.ts             # Multi-game iterator
  pgn.peggy             # Parser grammar (source of truth)
  pgn.js                # Generated parser (DO NOT EDIT)
  workerParser.js       # Worker implementation (CommonJS)

__tests__/              # All test files
  game-chessPgn-parity.test.ts  # Critical parity tests
  cursor.*.test.ts              # Cursor functionality

docs/
  index.md              # Documentation source
  index.html            # Generated documentation
```

## API Design Guidelines

### Public API

- Use JSDoc comments for all public methods (see `CONTRIBUTING.md`)
- API surface tracked by `@microsoft/api-extractor`
- Mark deprecated APIs with `@deprecated` JSDoc tag
- Breaking changes require major version bump

### Naming Conventions

```typescript
// Classes: PascalCase
;(ChessPGN, Game, Move, Cursor)

// Methods: camelCase
;(makeMove, isCheckmate, indexPgnGames)

// Constants: UPPER_SNAKE_CASE
;(DEFAULT_POSITION, SQUARES)

// Private: prefix _
;(_board, _makeMove)
```

### Method Delegation Pattern

```typescript
// In ChessPGN class - delegate to Game
move(move: string | object) {
  return this._game.move(move);
}

// When adding methods:
// 1. Implement in Game.ts
// 2. Add delegation in chessPGN.ts
// 3. Add parity test
```

## Common Pitfalls

1. **Don't edit `src/pgn.js`** - modify `src/pgn.peggy` and run `npm run parser`
2. **ChessPGN vs Game** - Logic changes go in `Game.ts`; ChessPGN just wraps
3. **Worker threads** - Always call `terminate()` when done with cursor
4. **Type imports** - Import from `types.ts`, not implementation files
5. **Parity tests** - Adding Game methods requires ChessPGN wrapper + parity
   test
6. **API changes** - Run `npm run api:update` after public API modifications

## Documentation Editing Rules

### For index.md

- Edit freely - it's the source of truth
- Keep comprehensive examples
- Maintain TOC structure
- Document all public API features

### For index.html

- **Preserve layout**: TOC on left, content on right
- Only minor edits for formatting/styling
- When index.md changes, carefully incorporate without breaking layout
- Test TOC navigation after changes
- Maintain responsive design

### Adding New Features

1. Implement feature in code
2. Add tests (including parity if needed)
3. Document in `docs/index.md`
4. Run `npm run api:update` if public API changed
5. Optionally update `docs/index.html` preserving layout

## Version Strategy

Current: 1.0.0 (stable release)

- **Major (x.0.0)** - Breaking changes to public API
- **Minor (1.x.0)** - New features, backward compatible
- **Patch (1.0.x)** - Bug fixes, no API changes

API surface is tracked in `etc/chess-pgn.api.md` for change detection.

## Performance Considerations

### Worker Thread Usage

- Recommended for 50+ games
- Optimal workers: 2-6 (CPU dependent)
- Batch size: 5-10 for typical games
- 3-5x speedup on large files

### Cursor Optimization

```typescript
{
  cacheSize: 20,        // Games in memory
  prefetch: 3,          // Prefetch ahead
  lazyParse: true,      // Parse on access
  workers: 4            // Parallel parsing
}
```

## Related Files

### Must-Read

- `src/Game.ts` - Core chess implementation
- `src/types.ts` - Type system
- `docs/index.md` - API documentation
- `CONTRIBUTING.md` - Contribution guidelines

### Configuration

- `rollup.config.mjs` - Multi-format build (CJS/ESM/types)
- `api-extractor.json` - API tracking config
- `peggy.config.mjs` - Parser generation config
- `vitest.config.mts` - Test configuration

## Key Principles

1. **Game.ts is the source of truth** - All chess logic lives here
2. **Parity is critical** - ChessPGN must equal Game output
3. **Documentation drives usage** - Keep docs/index.md authoritative
4. **API stability matters** - Track all public API changes
5. **Performance through workers** - Leverage parallel parsing for large files
6. **Type safety** - Use TypeScript strictly, export from types.ts
