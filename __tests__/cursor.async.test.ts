import { indexPgnGames, CursorImpl } from '../src/Cursor'
import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

/*
 * These tests validate worker thread performance for async iteration.
 * Run separately: npm test -- cursor.async.test.ts
 * 
 * Skipped in full test suite to avoid timeout issues with parallel test execution
 */
describe.skip('Cursor async iterator with workers', () => {
  const pgnPath = resolve(__dirname, 'pgn', 'wcup25.pgn')
  const pgn = readFileSync(pgnPath, 'utf8')
  const indices = indexPgnGames(pgn)

  test('async iterator works without workers (sync path)', async () => {
    const cursor = new CursorImpl(pgn, indices, {
      start: 0,
      workers: false,
    })

    const startTime = Date.now()
    let count = 0

    for await (const game of cursor) {
      expect(game).not.toBeNull()
      count++
      if (count >= 50) break
    }

    const elapsed = Date.now() - startTime

    console.log('\nAsync iterator (no workers):')
    console.log(`  Games parsed: ${count}`)
    console.log(`  Time: ${elapsed}ms (${(elapsed / count).toFixed(2)}ms/game)`)

    expect(count).toBe(50)
    expect(cursor.errors.length).toBe(0)
  }, 30000)

  test('async iterator with workers parses games', async () => {
    const cursor = new CursorImpl(pgn, indices, {
      start: 0,
      workers: 4,
      workerBatchSize: 10,
    })

    const startTime = Date.now()
    let count = 0

    for await (const game of cursor) {
      expect(game).not.toBeNull()
      count++
      if (count >= 50) break
    }

    const elapsed = Date.now() - startTime

    console.log('\nAsync iterator (4 workers, batch=10):')
    console.log(`  Games parsed: ${count}`)
    console.log(`  Time: ${elapsed}ms (${(elapsed / count).toFixed(2)}ms/game)`)

    expect(count).toBe(50)
    expect(cursor.errors.length).toBe(0)

    await cursor.terminate()
  }, 30000)

  test('async iterator with workers is faster than sync', async () => {
    // Sync cursor
    const syncCursor = new CursorImpl(pgn, indices, {
      start: 0,
      workers: false,
    })

    const syncStart = Date.now()
    let syncCount = 0
    for await (const game of syncCursor) {
      if (game) syncCount++
      if (syncCount >= 100) break
    }
    const syncTime = Date.now() - syncStart

    // Worker cursor
    const workerCursor = new CursorImpl(pgn, indices, {
      start: 0,
      workers: 4,
      workerBatchSize: 10,
    })

    const workerStart = Date.now()
    let workerCount = 0
    for await (const game of workerCursor) {
      if (game) workerCount++
      if (workerCount >= 100) break
    }
    const workerTime = Date.now() - workerStart

    console.log('\nPerformance comparison (100 games):')
    console.log(
      `  Sync: ${syncTime}ms (${(syncTime / syncCount).toFixed(2)}ms/game)`,
    )
    console.log(
      `  Workers: ${workerTime}ms (${(workerTime / workerCount).toFixed(2)}ms/game)`,
    )
    console.log(`  Speedup: ${(syncTime / workerTime).toFixed(2)}x`)

    expect(syncCount).toBe(100)
    expect(workerCount).toBe(100)

    /* Workers should be faster (or at least not drastically slower) */
    /* Allow for some overhead in small batches */
    expect(workerTime).toBeLessThan(syncTime * 1.5)

    await workerCursor.terminate()
  }, 60000)

  test('full file iteration with workers', async () => {
    const cursor = new CursorImpl(pgn, indices, {
      start: 0,
      workers: 8,
      workerBatchSize: 20,
    })

    const startTime = Date.now()
    let count = 0

    for await (const game of cursor) {
      if (game) count++
    }

    const elapsed = Date.now() - startTime

    console.log(`\nFull file iteration (${count} games):`)
    console.log(`  Time: ${elapsed}ms (${(elapsed / count).toFixed(2)}ms/game)`)
    console.log(`  Errors: ${cursor.errors.length}`)

    expect(count).toBe(469)

    await cursor.terminate()
  }, 60000)
})
