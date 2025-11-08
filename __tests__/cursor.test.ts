import { indexPgnGames, CursorImpl } from '../src/Cursor'
import { describe, test, expect } from 'vitest'

describe('Cursor indexing and headers', () => {
  const multiPgn = `[Event "Game One"]
[Site "Somewhere"]
[White "Alice"]
[Black "Bob"]

1. e4 e5 2. Nf3 Nc6 *

[Event "Game Two"]
[Site "Other"]
[White "Carol"]
[Black "Dave"]
[Annotator "O\\"Connor"]

1. d4 d5 *
`

  test('indexPgnGames extracts two games with headers and unescaped values', () => {
    const indices = indexPgnGames(multiPgn)
    expect(indices.length).toBe(2)
    expect(indices[0].headers).toBeDefined()
    expect(indices[0].headers!['Event']).toBe('Game One')
    expect(indices[0].headers!['White']).toBe('Alice')

    expect(indices[1].headers).toBeDefined()
    expect(indices[1].headers!['Event']).toBe('Game Two')
    // ensure escaped quote was unescaped in Annotator
    expect(indices[1].headers!['Annotator']).toBe('O"Connor')
  })

  test('CursorImpl.findNext filters by headers', () => {
    const indices = indexPgnGames(multiPgn)
    const cursor = new CursorImpl(multiPgn, indices, { start: 0 })
    const g = cursor.findNext((h) => h['White'] === 'Carol')
    expect(g).not.toBeNull()
    // when found, the returned object should be a Game (have a fen method)
    if (g)
      expect(typeof (g as unknown as { fen: () => string }).fen).toBe(
        'function',
      )
  })
})
