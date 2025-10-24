# Multi-Game PGN Support Proposal

> This proposal outlines enhancements to chess.js to support parsing and managing multiple games from a single PGN file, enabling efficient bulk operations and cursor-based iteration.

## Original Proposal

Items in _italics_ are refinements/enhancements that are not strictly necessary.

### 1. Add parameter to `loadPgn()` to switch to multi-game support

Default is single-game mode.

#### 1.1 Single game mode
All Chess functions behave as they do now.
- If the loaded PGN file _is_ multi-game, only the first game is parsed

#### 1.2 Multi-game mode

`loadPgn()` will take a cursor argument. The param can be:

1. **Empty array**: `loadPgn(cursor=[])`
2. **Boolean true**: equivalent to empty array param
3. **[start, length] integer pair**: start denotes the start of the cursor, and length denotes how many games are in the cursor's scope
   - e.g., `loadPgn(cursor=[1, 5])` returns a Cursor type starting at game 1 of the PGN file, and loading 5 games

#### 1.3 Cursor Type

The Cursor type has the following methods:

- **`next()`**: returns a Game (see #567). _This could be async_. The first call would return the first game in the Cursor instance.
- _**`before()`**: returns the previous game in the current Cursor position_
- If either `next()` and _`before()`_ overrun the Cursor boundary, it causes more games to be parsed and the Cursor to be updated
- If there is no next or _before_ game, then `null` is returned

#### 1.4 Two-Phase Parsing Strategy

Because some PGN files can be 100's of thousands of games, the PGN multi-game parsing is split into two phases:

1. **Phase 1 - Indexing**: Find the index of game boundaries in the PGN and store them
2. **Phase 2 - Parsing**: When a cursor is constructed, it fully parses the PGN game from the indexed game boundary, as well as subsequent games up to cursor length
   - _This could be an async operation, using threads for performance_
   - _A cursor might have a property indicating the total number of games in the PGN file_

---

## Suggested Additions & Clarifications

### 1. Leverage the New Game/Chess Architecture

**Recommendation**: Since you've successfully separated `Game` (pure logic) from `Chess` (I/O + metadata), consider making multi-game operations work primarily with the lightweight `Game` class.

```typescript
interface Cursor {
  next(): Game | null;           // Returns lightweight Game instance
  before?(): Game | null;        // Optional backward navigation
  hasNext(): boolean;
  hasBefore?(): boolean;
  position: number;
  totalGames?: number;           // Total games in PGN file
}

class Chess {
  loadPgn(pgn: string, options?: { cursor?: boolean | number[] }): void | Cursor {
    if (!options?.cursor) {
      // Single-game mode (current behavior)
      return;
    }
    // Multi-game mode - return cursor
    return createCursor(pgn, options.cursor);
  }
}
```

**Why**: Creating hundreds of `Chess` instances upfront is memory-intensive. The `Game` class is perfect for cursor-based operations. Users can wrap individual games in `Chess` when they need the full API.

### 2. Cursor Configuration Options

**Recommendation**: Extend cursor configuration for flexibility:

```typescript
interface CursorOptions {
  start?: number;        // Starting game index (default: 0)
  length?: number;       // Number of games to load (default: all)
  prefetch?: number;     // Number of games to prefetch (default: 1)
  includeMetadata?: boolean; // Load headers/comments (default: true)
}

// Usage examples:
loadPgn(pgn, { cursor: true })                    // All games, defaults
loadPgn(pgn, { cursor: [1, 5] })                  // Games 1-5
loadPgn(pgn, { cursor: { start: 10, length: 20, prefetch: 5 } })
```

**Why**: Different use cases need different performance characteristics. Prefetching improves iteration speed; optional metadata reduces memory for analysis tasks.

### 3. Async Iterator Support

**Recommendation**: Implement async iteration for better integration with modern JavaScript:

```typescript
interface Cursor {
  next(): Game | null;
  [Symbol.asyncIterator](): AsyncIterableIterator<Game>;
}

// Usage with async/await
const cursor = chess.loadPgn(largePgn, { cursor: true });
for await (const game of cursor) {
  // Process each game
  if (game.isCheckmate()) {
    console.log('Found checkmate');
  }
}
```

**Why**: Async iteration is the idiomatic way to handle lazy sequences in modern JavaScript. It naturally supports the async parsing you mentioned.

### 4. Game Boundary Detection Strategy

**Recommendation**: Specify how game boundaries are detected in the indexing phase:

```typescript
interface IndexOptions {
  delimiter?: 'headers' | 'blank-lines' | 'auto'; // Default: 'auto'
  requiredHeaders?: string[]; // Default: ['Event']
}

// Phase 1: Indexing
interface GameIndex {
  startOffset: number;    // Byte offset in PGN string
  endOffset: number;
  headers?: Record<string, string>; // Pre-parsed headers for filtering
}
```

**Example indexing logic**:
- Look for lines starting with `[Event ` or other header tags
- Store byte offsets for each game start/end
- Optionally parse headers during indexing for quick filtering

**Why**: Clear specification helps implementers and users understand edge cases.

### 5. Error Handling in Multi-Game Context

**Recommendation**: Define behavior when encountering malformed games:

```typescript
interface CursorOptions {
  strict?: boolean; // Throw on first error (default: false)
  onError?: (error: Error, gameIndex: number) => void;
}

interface Cursor {
  next(): Game | null;
  errors: Array<{ index: number; error: Error }>; // Track skipped games
}

// Usage
const cursor = chess.loadPgn(pgn, { 
  cursor: true,
  strict: false,
  onError: (err, idx) => console.warn(`Game ${idx} failed: ${err.message}`)
});
```

**Why**: Real-world PGN files often have malformed games. Users need control over whether to fail fast or skip bad games.

### 6. Filtering and Seeking

**Recommendation**: Add methods to efficiently navigate to specific games:

```typescript
interface Cursor {
  next(): Game | null;
  before?(): Game | null;
  
  // Navigation
  seek(index: number): boolean;      // Jump to specific game
  reset(): void;                      // Return to start
  
  // Filtering (uses pre-parsed headers from index)
  findNext(predicate: (headers: Record<string, string>) => boolean): Game | null;
  
  // Stats
  position: number;
  totalGames?: number;
}

// Usage
const cursor = chess.loadPgn(pgn, { cursor: true });
// Find first game where white is "Kasparov"
const game = cursor.findNext(h => h.White === 'Kasparov');
```

**Why**: For large PGN files, users often want to find specific games without iterating through all of them.

### 7. Memory Management

**Recommendation**: Implement automatic cleanup and cache limits:

```typescript
interface CursorOptions {
  cacheSize?: number;     // Max games to keep in memory (default: 10)
  lazyParse?: boolean;    // Parse moves only when accessed (default: true)
}

// Internal implementation
class CursorImpl {
  private cache: Map<number, Game>; // LRU cache
  private maxCacheSize: number;
  
  next(): Game | null {
    // Evict old games from cache when limit reached
    if (this.cache.size >= this.maxCacheSize) {
      this.evictOldest();
    }
    return this.parseAndCache(this.position++);
  }
}
```

**Why**: For very large files, unbounded memory growth is a problem. LRU cache balances performance and memory usage.

### 8. Type Safety

**Recommendation**: Ensure TypeScript types clearly distinguish single vs. multi-game mode:

```typescript
// Overload signatures
class Chess {
  loadPgn(pgn: string): void;                                    // Single game
  loadPgn(pgn: string, options: { cursor: false }): void;       // Explicit single
  loadPgn(pgn: string, options: { cursor: true | number[] | CursorOptions }): Cursor; // Multi-game
}

// No ambiguous Chess | Cursor union type
```

**Why**: Clear types prevent runtime errors and improve developer experience.

### 9. Backward Compatibility

**Recommendation**: Ensure zero breaking changes:

```typescript
// ✅ Existing code continues to work unchanged
const chess = new Chess();
chess.loadPgn(pgn); // Single game mode, returns void

// ✅ Opt-in to new functionality
const cursor = chess.loadPgn(pgn, { cursor: true });
```

**Why**: chess.js has many users. Breaking the existing API would be problematic.

### 10. Performance Benchmarks

**Recommendation**: Define performance targets and document them:

```typescript
// Example benchmarks to track:
// - Index 10,000 games: < 1 second
// - Parse single game from index: < 10ms
// - Memory per cached game: < 50KB (Game class without Chess wrapper)
// - Async parsing throughput: > 1000 games/second
```

Include a benchmark suite in tests:
```typescript
// __tests__/multi-game-performance.test.ts
test('indexes large PGN efficiently', async () => {
  const pgn = load100kGamesPgn();
  const start = performance.now();
  const cursor = chess.loadPgn(pgn, { cursor: true });
  const indexTime = performance.now() - start;
  
  expect(indexTime).toBeLessThan(5000); // 5 seconds
  expect(cursor.totalGames).toBe(100000);
});
```

---

## Implementation Phases

### Phase 1: Core Infrastructure
1. Implement game boundary indexing algorithm
2. Create basic Cursor interface with `next()` and `hasNext()`
3. Support simple cursor creation: `loadPgn(pgn, { cursor: true })`
4. Add tests for multi-game parsing

### Phase 2: Navigation & Filtering
1. Add `before()` for backward navigation
2. Implement `seek()` and `reset()`
3. Add header-based filtering with `findNext()`
4. Implement cursor range: `loadPgn(pgn, { cursor: [start, length] })`

### Phase 3: Performance & Async
1. Add async iterator support
2. Implement LRU cache for parsed games
3. Add prefetching with configurable window
4. _Optional: Worker thread support for parsing_

### Phase 4: Polish
1. Comprehensive error handling
2. Performance benchmarks
3. Documentation with examples
4. Migration guide for users

---

## Example Use Cases

### Use Case 1: Batch Analysis
```typescript
// Analyze opening frequencies in a large database
const cursor = chess.loadPgn(databasePgn, { cursor: true });
const openings = new Map<string, number>();

for await (const game of cursor) {
  const firstMove = game.history()[0];
  openings.set(firstMove, (openings.get(firstMove) || 0) + 1);
}
```

### Use Case 2: Filtered Export
```typescript
// Export only games where Kasparov played white
const cursor = chess.loadPgn(pgn, { cursor: true });
const kasparovGames: Game[] = [];

let game = cursor.findNext(h => h.White === 'Kasparov');
while (game) {
  kasparovGames.push(game);
  game = cursor.findNext(h => h.White === 'Kasparov');
}
```

### Use Case 3: Paginated Display
```typescript
// Show games 10-20 from a large file
const cursor = chess.loadPgn(pgn, { cursor: [10, 10] });
const page: Game[] = [];

while (cursor.hasNext()) {
  page.push(cursor.next()!);
}
```

### Use Case 4: Memory-Efficient Processing
```typescript
// Process 100k games without running out of memory
const cursor = chess.loadPgn(hugePgn, { 
  cursor: true,
  cacheSize: 5, // Keep only 5 games in memory
  includeMetadata: false // Skip headers/comments for analysis
});

let checkmateCount = 0;
for await (const game of cursor) {
  if (game.isCheckmate()) checkmateCount++;
  // Game is automatically evicted from cache after processing
}
```

---

## Why This Refactoring Helps

The separation of `Game` (pure state) from `Chess` (I/O + metadata) creates a perfect foundation for multi-game support:

- **Game class**: Lightweight (~10KB per instance), ideal for cursors and bulk operations
- **Chess class**: Rich API (~50KB+ with metadata), for single-game interaction  
- **Cursor pattern**: Return `Game` instances from cursor, wrap in `Chess` only when full API needed
- **Memory efficiency**: Store many `Game` instances, create `Chess` on demand
- **Performance**: Parse directly to `Game`, defer PGN generation until `chess.pgn()` called

This architecture naturally supports both use cases:
- **Bulk operations**: Work with `Game[]` or Cursor yielding `Game` instances
- **Interactive use**: Wrap individual games in `Chess` for full API access

---

## Open Questions

1. Should `Cursor.next()` return `Game` or `Chess`? (Recommendation: `Game` for performance)
2. Should cursor be a separate class or interface? (Recommendation: interface for flexibility)
3. Should indexing be done synchronously or asynchronously? (Recommendation: sync for simplicity, unless file is huge)
4. Should we support writing multi-game PGN files? (Recommendation: defer to future version)
5. Should `before()` be included in Phase 1 or Phase 2? (Recommendation: Phase 2, as it's marked optional in proposal)

---

## Conclusion

This proposal leverages the new `Game`/`Chess` architecture to enable efficient multi-game PGN support. The cursor-based approach provides:

- ✅ Zero breaking changes to existing API
- ✅ Memory-efficient processing of large files
- ✅ Flexible navigation and filtering
- ✅ Clear migration path with phased implementation
- ✅ Modern async/await patterns
- ✅ Type-safe API with clear semantics

The combination of indexed boundaries (Phase 1) and lazy parsing (Phase 2) makes it practical to work with PGN files containing hundreds of thousands of games.
