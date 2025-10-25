import { ChessPGN, DEFAULT_POSITION } from '../src/chessPGN'
import { expect, test } from 'vitest'

test('reset', () => {
  const chess = new ChessPGN()
  chess.clear()
  chess.reset()
  expect(chess.fen()).toEqual(DEFAULT_POSITION)
})
