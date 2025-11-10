# Worker Thread Support for Async Iteration

## Overview

The Cursor now supports optional worker thread parallelization for parsing large
PGN files. This provides **~3x speedup** for async iteration by distributing
parsing across multiple CPU cores.

## Usage

```typescript
import { indexPgnGames, CursorImpl } from '@chess-pgn/chess-pgn'

const pgn = '...' // Large PGN file
const indices = indexPgnGames(pgn)

// Enable workers with async iteration
const cursor = new CursorImpl(pgn, indices, {
  workers: 4, // Number of worker threads
  workerBatchSize: 10, // Games per batch
})

// Iterate with workers
for await (const game of cursor) {
  console.log(game.headers())
}

// Clean up when done
await cursor.terminate()
```

## Performance

Benchmark results on wcup25.pgn (469 games):

- **Sync iteration**: ~48ms/game
- **Workers (4 threads)**: ~15ms/game
- **Speedup**: 3.2x faster

## How It Works

1. **Batch Processing**: Games are parsed in batches to amortize worker overhead
2. **Worker Pool**: Manages N worker threads with round-robin task distribution
3. **Async Iterator**: `Symbol.asyncIterator` automatically uses workers when
   enabled
4. **Sync Fallback**: Regular `next()` method remains synchronous for
   compatibility

## Options

```typescript
interface CursorOptions {
  workers?: boolean | number // false, true (4 workers), or specific count
  workerBatchSize?: number // Games per batch (default: 10)
  // ... other options
}
```

## Implementation Notes

- Workers are only used with `for await` iteration
- Sync `next()` method ignores worker option
- Workers compile to standalone bundle via esbuild
- Automatic cleanup on cursor termination

## Testing

Run worker performance tests:

```bash
npm test -- cursor.async.test.ts
```

This will output benchmark results showing:

- Sync iteration baseline
- Worker iteration performance
- Full file iteration (469 games)
- Speedup comparison

Example output:

```
Async iterator (no workers):
  Games parsed: 50
  Time: 2388ms (47.76ms/game)

Async iterator (4 workers, batch=10):
  Games parsed: 50
  Time: 854ms (17.08ms/game)

Performance comparison (100 games):
  Sync: 4850ms (48.50ms/game)
  Workers: 1503ms (15.03ms/game)
  Speedup: 3.23x
```

Worker tests are skipped in full test suite to avoid timeout issues with
parallel execution.

## Requirements

- Node.js 14+ (worker_threads support)
- esbuild (dev dependency for worker compilation)
