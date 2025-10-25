import { ChessPGN } from '../src/chessPGN'
import { describe, expect, it, test } from 'vitest'

test('isCheck - no, starting position', () => {
  const chess = new ChessPGN()
  expect(chess.isCheck()).toBe(false)
})

test('isCheck - yes, black giving check', () => {
  const chess = new ChessPGN(
    'rnb1kbnr/pppp1ppp/8/8/4Pp1q/2N5/PPPP2PP/R1BQKBNR w KQkq - 2 4',
  )
  expect(chess.isCheck()).toBe(true)
})

test('isCheck - yes, checkmate is also check', () => {
  const chess = new ChessPGN('R3k3/8/4K3/8/8/8/8/8 b - - 0 1')
  expect(chess.isCheck()).toBe(true)
})

test('isCheck - no, stalemate is not check', () => {
  const chess = new ChessPGN('4k3/4P3/4K3/8/8/8/8/8 b - - 0 1')
  expect(chess.isCheck()).toBe(false)
})
