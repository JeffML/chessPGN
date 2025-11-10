#!/usr/bin/env node

/**
 * Benchmark script to compare sync vs async iteration with workers
 * Run directly from source (not from built package):
 *   node --loader ts-node/esm examples/worker-benchmark.mjs
 * Or just run the test instead:
 *   npm test -- cursor.async.test.ts
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

// Import directly from source for demonstration
// In production, this would be: import { indexPgnGames, CursorImpl } from '@chess-pgn/chess-pgn'
import { indexPgnGames, CursorImpl } from '../src/Cursor.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pgnPath = resolve(__dirname, '../__tests__/pgn/wcup25.pgn')
const pgn = readFileSync(pgnPath, 'utf8')
const indices = indexPgnGames(pgn)

console.log(`Loaded ${indices.length} games from wcup25.pgn\n`)

// Benchmark sync iteration
console.log('=== Synchronous iteration ===')
const syncCursor = new CursorImpl(pgn, indices, { workers: false })
const syncStart = Date.now()
let syncCount = 0

for await (const game of syncCursor) {
  if (game) syncCount++
}

const syncTime = Date.now() - syncStart
console.log(`Parsed ${syncCount} games in ${syncTime}ms`)
console.log(`Average: ${(syncTime / syncCount).toFixed(2)}ms/game\n`)

// Benchmark worker iteration
console.log('=== Async iteration with workers ===')
const workerCursor = new CursorImpl(pgn, indices, {
  workers: 4,
  workerBatchSize: 10,
})

const workerStart = Date.now()
let workerCount = 0

for await (const game of workerCursor) {
  if (game) workerCount++
}

const workerTime = Date.now() - workerStart
console.log(`Parsed ${workerCount} games in ${workerTime}ms`)
console.log(`Average: ${(workerTime / workerCount).toFixed(2)}ms/game`)
console.log(`Speedup: ${(syncTime / workerTime).toFixed(2)}x\n`)

await workerCursor.terminate()
