import { indexPgnGames, CursorImpl } from '../src/Cursor'
import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

describe('Cursor file-backed fixture', () => {
  test('index and cursor over __tests__/pgn/multi-escape.pgn', () => {
    const pgnPath = resolve(__dirname, 'pgn', 'multi-escape.pgn')
    const pgn = readFileSync(pgnPath, 'utf8')

    const indices = indexPgnGames(pgn)
    expect(indices.length).toBe(3)

  // second game should have Annotator with unescaped quote
  expect(indices[1].headers).toBeDefined()
  expect(indices[1].headers!['Annotator']).toBe('O"Connor')

    const cursor = new CursorImpl(pgn, indices, { start: 0 })
    const g = cursor.findNext((h) => h['White'] === 'Carol')
    expect(g).not.toBeNull()
    if (g) expect(typeof (g as unknown as { fen: () => string }).fen).toBe('function')
  })
})
