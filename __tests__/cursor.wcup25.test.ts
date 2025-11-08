import { indexPgnGames, CursorImpl } from '../src/Cursor'
import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

describe('Cursor with wcup25.pgn', () => {
  const pgnPath = resolve(__dirname, 'pgn', 'wcup25.pgn')
  const pgn = readFileSync(pgnPath, 'utf8')

  test('indexes all 469 games', () => {
    const indices = indexPgnGames(pgn)
    expect(indices.length).toBe(469)
  })

  test('all games have headers extracted', () => {
    const indices = indexPgnGames(pgn)
    for (const index of indices) {
      expect(index.headers).toBeDefined()
      expect(index.headers!['Event']).toBe('FIDE World Cup 2025')
      expect(index.headers!['Site']).toBeDefined()
    }
  })

  test('cursor can iterate through all games', () => {
    const indices = indexPgnGames(pgn)
    const cursor = new CursorImpl(pgn, indices, { start: 0 })

    let count = 0
    while (cursor.hasNext()) {
      const game = cursor.next()
      expect(game).not.toBeNull()
      count++
    }
    expect(count).toBe(469)
  }, 60000) // 60 second timeout for parsing all 469 games

  test('findNext can filter by headers', () => {
    const indices = indexPgnGames(pgn)
    const cursor = new CursorImpl(pgn, indices, { start: 0 })

    // Find a game with a specific white player
    const game = cursor.findNext((h) => h['White'] === 'Harikrishna, Pentala')
    expect(game).not.toBeNull()
    if (game) {
      expect(typeof (game as unknown as { fen: () => string }).fen).toBe(
        'function',
      )
    }
  })

  test('can find games by round', () => {
    const indices = indexPgnGames(pgn)

    // Count games in round 1.1 using header index (no parsing needed)
    let count = 0
    for (const idx of indices) {
      if (idx.headers && idx.headers['Round'] === '1.1') {
        count++
      }
    }

    expect(count).toBeGreaterThan(0)
  })

  test('cursor reports no errors on valid games', () => {
    const indices = indexPgnGames(pgn)
    const cursor = new CursorImpl(pgn, indices, { start: 0, cacheSize: 50 })

    // Iterate through first 50 games
    let count = 0
    while (cursor.hasNext() && count < 50) {
      cursor.next()
      count++
    }

    expect(cursor.errors.length).toBe(0)
  })
})
