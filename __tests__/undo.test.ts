import { ChessPGN } from '../src/chessPGN'
import { expect, test } from 'vitest'

test('undo - works', () => {
  const chess = new ChessPGN()

  chess.move('e4')
  chess.move('e5')
  expect(chess.undo()?.san).toEqual('e5')
  expect(chess.undo()?.san).toEqual('e4')
  expect(chess.undo()).toBeNull()

  chess.undo()
})
