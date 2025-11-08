import { indexPgnGames, CursorImpl } from '../src/Cursor'
import { describe, test, expect } from 'vitest'

describe('Cursor fallback parsing', () => {
  test('fallback works when header contains backslash-escaped quote', () => {
    const multiPgn = `[Event "With Escape"]
[Site "X"]
[White "A"]
[Black "B"]
[Annotator "O\\\"Neil"]

1. e4 e5 *
`
    const indices = indexPgnGames(multiPgn)
    expect(indices.length).toBe(1)
    expect(indices[0].headers).toBeDefined()
    expect(indices[0].headers!['Annotator']).toBe('O"Neil')

    const cursor = new CursorImpl(multiPgn, indices, { start: 0 })
    const g = cursor.findNext((h) => h['White'] === 'A')
    expect(g).not.toBeNull()
    if (g)
      expect(typeof (g as unknown as { fen: () => string }).fen).toBe(
        'function',
      )
  })
})
